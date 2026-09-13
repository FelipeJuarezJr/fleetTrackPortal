-- ============================================================================
-- FleetTrack & Sales Portal - Database Schema Definition
-- Target: Azure SQL Database / Microsoft SQL Server 2019+
-- Script: 01_schema.sql
-- Description: Creates the core relational tables with constraints and indexes.
-- ============================================================================

-- Ensure clean execution context
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- 1. Create FleetUnits Table
IF OBJECT_ID(N'dbo.SalesOrders', N'U') IS NOT NULL
    DROP TABLE dbo.SalesOrders;
GO

IF OBJECT_ID(N'dbo.FleetUnits', N'U') IS NOT NULL
    DROP TABLE dbo.FleetUnits;
GO

CREATE TABLE dbo.FleetUnits
(
    UnitId          INT IDENTITY(1,1)   NOT NULL,
    EquipmentNumber VARCHAR(20)         NOT NULL,
    VIN             VARCHAR(17)         NOT NULL,
    Make            VARCHAR(50)         NOT NULL,
    Model           VARCHAR(50)         NOT NULL,
    [Year]          INT                 NOT NULL,
    Mileage         INT                 NOT NULL,
    ConditionStatus VARCHAR(30)         NOT NULL CONSTRAINT DF_FleetUnits_ConditionStatus DEFAULT ('Pending Inspection'),
    AskingPrice     DECIMAL(18, 2)      NOT NULL CONSTRAINT DF_FleetUnits_AskingPrice DEFAULT (0.00),
    CurrentLocation VARCHAR(100)        NOT NULL,
    CreatedDate     DATETIME2(7)        NOT NULL CONSTRAINT DF_FleetUnits_CreatedDate DEFAULT (SYSUTCDATETIME()),
    UpdatedDate     DATETIME2(7)        NULL,

    -- Constraints
    CONSTRAINT PK_FleetUnits_UnitId PRIMARY KEY CLUSTERED (UnitId ASC),
    CONSTRAINT UQ_FleetUnits_EquipmentNumber UNIQUE NONCLUSTERED (EquipmentNumber ASC),
    CONSTRAINT UQ_FleetUnits_VIN UNIQUE NONCLUSTERED (VIN ASC),
    CONSTRAINT CK_FleetUnits_Year CHECK ([Year] BETWEEN 1990 AND 2050),
    CONSTRAINT CK_FleetUnits_Mileage CHECK (Mileage >= 0),
    CONSTRAINT CK_FleetUnits_AskingPrice CHECK (AskingPrice >= 0.00),
    CONSTRAINT CK_FleetUnits_ConditionStatus CHECK (ConditionStatus IN ('Pending Inspection', 'Ready for Sale', 'Under Maintenance', 'Reserved', 'Sold'))
);
GO

-- Performance Indexes for Fleet Filtering & Querying
CREATE NONCLUSTERED INDEX IX_FleetUnits_ConditionStatus 
ON dbo.FleetUnits (ConditionStatus)
INCLUDE (EquipmentNumber, Make, Model, [Year], Mileage, AskingPrice, CurrentLocation);
GO

CREATE NONCLUSTERED INDEX IX_FleetUnits_CurrentLocation 
ON dbo.FleetUnits (CurrentLocation)
INCLUDE (ConditionStatus, AskingPrice);
GO

CREATE NONCLUSTERED INDEX IX_FleetUnits_CreatedDate 
ON dbo.FleetUnits (CreatedDate DESC);
GO

-- 2. Create SalesOrders Table
CREATE TABLE dbo.SalesOrders
(
    OrderId         INT IDENTITY(1,1)   NOT NULL,
    OrderNumber     VARCHAR(30)         NOT NULL,
    BuyerName       VARCHAR(100)        NOT NULL,
    UnitId          INT                 NOT NULL,
    SalePrice       DECIMAL(18, 2)      NOT NULL,
    SaleDate        DATETIME2(7)        NOT NULL CONSTRAINT DF_SalesOrders_SaleDate DEFAULT (SYSUTCDATETIME()),
    Notes           NVARCHAR(MAX)       NULL,
    CreatedBy       VARCHAR(100)        NOT NULL CONSTRAINT DF_SalesOrders_CreatedBy DEFAULT ('SystemPortal'),

    -- Constraints
    CONSTRAINT PK_SalesOrders_OrderId PRIMARY KEY CLUSTERED (OrderId ASC),
    CONSTRAINT UQ_SalesOrders_OrderNumber UNIQUE NONCLUSTERED (OrderNumber ASC),
    CONSTRAINT FK_SalesOrders_FleetUnits_UnitId FOREIGN KEY (UnitId) 
        REFERENCES dbo.FleetUnits (UnitId) 
        ON DELETE NO_ACTION,
    CONSTRAINT CK_SalesOrders_SalePrice CHECK (SalePrice >= 0.00)
);
GO

-- Index for Sales Order lookups and analytics
CREATE NONCLUSTERED INDEX IX_SalesOrders_UnitId 
ON dbo.SalesOrders (UnitId);
GO

CREATE NONCLUSTERED INDEX IX_SalesOrders_SaleDate 
ON dbo.SalesOrders (SaleDate DESC)
INCLUDE (OrderNumber, BuyerName, SalePrice);
GO
