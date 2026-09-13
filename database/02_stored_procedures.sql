-- ============================================================================
-- FleetTrack & Sales Portal - Stored Procedures
-- Target: Azure SQL Database / Microsoft SQL Server 2019+
-- Script: 02_stored_procedures.sql
-- Description: Parameterized, atomic stored procedures for querying fleet
--              inventory and executing transactional sales order workflows.
-- ============================================================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================================
-- 1. Stored Procedure: sp_GetAvailableFleetUnits
-- Description: Retrieves fleet units filtered by optional location, condition status,
--              or text search terms (Make, Model, Equipment#, VIN).
-- ============================================================================
IF OBJECT_ID(N'dbo.sp_GetAvailableFleetUnits', N'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetAvailableFleetUnits;
GO

CREATE PROCEDURE dbo.sp_GetAvailableFleetUnits
    @Location        VARCHAR(100) = NULL,
    @ConditionStatus VARCHAR(30)  = NULL,
    @SearchTerm      VARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Clean parameters
    SET @Location = NULLIF(LTRIM(RTRIM(@Location)), '');
    SET @ConditionStatus = NULLIF(LTRIM(RTRIM(@ConditionStatus)), '');
    SET @SearchTerm = NULLIF(LTRIM(RTRIM(@SearchTerm)), '');

    SELECT 
        u.UnitId,
        u.EquipmentNumber,
        u.VIN,
        u.Make,
        u.Model,
        u.[Year],
        u.Mileage,
        u.ConditionStatus,
        u.AskingPrice,
        u.CurrentLocation,
        u.CreatedDate,
        u.UpdatedDate,
        -- Check if unit was sold and bring latest order number if applicable
        o.OrderNumber AS LastOrderNumber,
        o.BuyerName AS LastBuyerName,
        o.SalePrice AS ActualSalePrice,
        o.SaleDate AS LastSaleDate
    FROM dbo.FleetUnits u
    LEFT JOIN dbo.SalesOrders o ON u.UnitId = o.UnitId
    WHERE 
        (@Location IS NULL OR u.CurrentLocation = @Location)
        AND (@ConditionStatus IS NULL OR u.ConditionStatus = @ConditionStatus)
        AND (
            @SearchTerm IS NULL 
            OR u.EquipmentNumber LIKE '%' + @SearchTerm + '%'
            OR u.VIN LIKE '%' + @SearchTerm + '%'
            OR u.Make LIKE '%' + @SearchTerm + '%'
            OR u.Model LIKE '%' + @SearchTerm + '%'
            OR u.CurrentLocation LIKE '%' + @SearchTerm + '%'
        )
    ORDER BY 
        CASE WHEN u.ConditionStatus = 'Ready for Sale' THEN 0 
             WHEN u.ConditionStatus = 'Pending Inspection' THEN 1 
             ELSE 2 END,
        u.CreatedDate DESC;
END;
GO

-- ============================================================================
-- 2. Stored Procedure: sp_CreateSalesOrder
-- Description: Executes an atomic, transactional purchase order creation.
--              Validates unit availability, locks the row, inserts order record,
--              updates unit condition to 'Sold', and returns generated OrderId.
-- ============================================================================
IF OBJECT_ID(N'dbo.sp_CreateSalesOrder', N'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_CreateSalesOrder;
GO

CREATE PROCEDURE dbo.sp_CreateSalesOrder
    @UnitId      INT,
    @BuyerName   VARCHAR(100),
    @SalePrice   DECIMAL(18,2),
    @Notes       NVARCHAR(MAX) = NULL,
    @OrderNumber VARCHAR(30)   = NULL,
    @CreatedBy   VARCHAR(100)  = 'PortalUser'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- Validation
    IF @UnitId IS NULL OR @UnitId <= 0
    BEGIN
        RAISERROR('Invalid UnitId specified.', 16, 1);
        RETURN -1;
    END

    IF @BuyerName IS NULL OR LTRIM(RTRIM(@BuyerName)) = ''
    BEGIN
        RAISERROR('Buyer name is required.', 16, 1);
        RETURN -2;
    END

    IF @SalePrice IS NULL OR @SalePrice < 0
    BEGIN
        RAISERROR('Sale price cannot be negative.', 16, 1);
        RETURN -3;
    END

    -- Generate unique OrderNumber if not provided (e.g. SO-2026-XXXXX)
    IF @OrderNumber IS NULL OR LTRIM(RTRIM(@OrderNumber)) = ''
    BEGIN
        SET @OrderNumber = 'SO-' + FORMAT(SYSUTCDATETIME(), 'yyyyMMdd') + '-' + UPPER(SUBSTRING(CONVERT(VARCHAR(36), NEWID()), 1, 6));
    END

    DECLARE @CurrentStatus VARCHAR(30);
    DECLARE @EquipmentNo   VARCHAR(20);
    DECLARE @NewOrderId    INT;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Lock and verify the target unit row (SERIALIZABLE isolation for the row)
        SELECT 
            @CurrentStatus = ConditionStatus,
            @EquipmentNo   = EquipmentNumber
        FROM dbo.FleetUnits WITH (UPDLOCK, ROWLOCK)
        WHERE UnitId = @UnitId;

        IF @CurrentStatus IS NULL
        BEGIN
            RAISERROR('Fleet unit with ID %d does not exist.', 16, 1, @UnitId);
        END

        IF @CurrentStatus = 'Sold'
        BEGIN
            RAISERROR('Fleet unit %s (ID %d) has already been sold.', 16, 1, @EquipmentNo, @UnitId);
        END

        -- 2. Insert into SalesOrders
        INSERT INTO dbo.SalesOrders 
        (
            OrderNumber,
            BuyerName,
            UnitId,
            SalePrice,
            SaleDate,
            Notes,
            CreatedBy
        )
        VALUES 
        (
            @OrderNumber,
            LTRIM(RTRIM(@BuyerName)),
            @UnitId,
            @SalePrice,
            SYSUTCDATETIME(),
            @Notes,
            @CreatedBy
        );

        SET @NewOrderId = SCOPE_IDENTITY();

        -- 3. Update the FleetUnit's condition status atomically to 'Sold'
        UPDATE dbo.FleetUnits
        SET 
            ConditionStatus = 'Sold',
            UpdatedDate     = SYSUTCDATETIME()
        WHERE UnitId = @UnitId;

        COMMIT TRANSACTION;

        -- Return the newly created order details along with unit information
        SELECT 
            o.OrderId,
            o.OrderNumber,
            o.BuyerName,
            o.UnitId,
            u.EquipmentNumber,
            u.Make,
            u.Model,
            u.[Year],
            o.SalePrice,
            o.SaleDate,
            o.Notes,
            u.ConditionStatus AS NewUnitStatus
        FROM dbo.SalesOrders o
        INNER JOIN dbo.FleetUnits u ON o.UnitId = u.UnitId
        WHERE o.OrderId = @NewOrderId;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        -- Re-throw error with context
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
        RETURN -99;
    END CATCH
END;
GO

-- ============================================================================
-- 3. Stored Procedure: sp_GetFleetSummaryKpis
-- Description: Aggregates real-time KPIs for executive & operations dashboards.
-- ============================================================================
IF OBJECT_ID(N'dbo.sp_GetFleetSummaryKpis', N'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetFleetSummaryKpis;
GO

CREATE PROCEDURE dbo.sp_GetFleetSummaryKpis
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @FirstDayOfMonth DATETIME2(7) = DATEFROMPARTS(YEAR(SYSUTCDATETIME()), MONTH(SYSUTCDATETIME()), 1);

    SELECT 
        COUNT(*) AS TotalFleetUnits,
        SUM(CASE WHEN ConditionStatus = 'Ready for Sale' THEN 1 ELSE 0 END) AS ReadyForSaleUnits,
        SUM(CASE WHEN ConditionStatus = 'Pending Inspection' THEN 1 ELSE 0 END) AS PendingInspectionUnits,
        SUM(CASE WHEN ConditionStatus = 'Under Maintenance' THEN 1 ELSE 0 END) AS UnderMaintenanceUnits,
        SUM(CASE WHEN ConditionStatus = 'Sold' THEN 1 ELSE 0 END) AS TotalSoldUnits,
        ISNULL(SUM(CASE WHEN ConditionStatus = 'Ready for Sale' THEN AskingPrice ELSE 0 END), 0.00) AS ActiveInventoryValuation,
        (
            SELECT COUNT(*) 
            FROM dbo.SalesOrders 
            WHERE SaleDate >= @FirstDayOfMonth
        ) AS UnitsSoldThisMonth,
        (
            SELECT ISNULL(SUM(SalePrice), 0.00) 
            FROM dbo.SalesOrders 
            WHERE SaleDate >= @FirstDayOfMonth
        ) AS SalesRevenueThisMonth
    FROM dbo.FleetUnits;
END;
GO

-- ============================================================================
-- 4. Stored Procedure: sp_GetFleetUnitById
-- Description: Retrieves a single unit with full technical metadata.
-- ============================================================================
IF OBJECT_ID(N'dbo.sp_GetFleetUnitById', N'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetFleetUnitById;
GO

CREATE PROCEDURE dbo.sp_GetFleetUnitById
    @UnitId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        u.UnitId,
        u.EquipmentNumber,
        u.VIN,
        u.Make,
        u.Model,
        u.[Year],
        u.Mileage,
        u.ConditionStatus,
        u.AskingPrice,
        u.CurrentLocation,
        u.CreatedDate,
        u.UpdatedDate,
        o.OrderId,
        o.OrderNumber,
        o.BuyerName,
        o.SalePrice,
        o.SaleDate,
        o.Notes
    FROM dbo.FleetUnits u
    LEFT JOIN dbo.SalesOrders o ON u.UnitId = o.UnitId
    WHERE u.UnitId = @UnitId;
END;
GO
