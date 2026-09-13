-- ============================================================================
-- FleetTrack & Sales Portal - Seed Data Script
-- Target: Azure SQL Database / Microsoft SQL Server 2019+
-- Script: 03_seed_data.sql
-- Description: Inserts realistic enterprise fleet inventory (rental box trucks,
--              cargo vans, car haulers) and historical sales orders.
-- ============================================================================

SET NOCOUNT ON;

-- Clean existing data
DELETE FROM dbo.SalesOrders;
DELETE FROM dbo.FleetUnits;

DBCC CHECKIDENT ('dbo.FleetUnits', RESEED, 0);
DBCC CHECKIDENT ('dbo.SalesOrders', RESEED, 0);

PRINT 'Seeding FleetUnits inventory...';

INSERT INTO dbo.FleetUnits 
(
    EquipmentNumber, VIN, Make, Model, [Year], Mileage, ConditionStatus, AskingPrice, CurrentLocation, CreatedDate
)
VALUES
-- Retired Rental Box Trucks (Medium Duty)
('TRK-10482', '1FVACWDT8HH129841', 'Freightliner', 'M2 106 26ft Box', 2021, 142350, 'Ready for Sale', 48500.00, 'Dallas, TX', DATEADD(DAY, -45, SYSUTCDATETIME())),
('TRK-10483', '1FVACWDT2HH129842', 'Freightliner', 'M2 106 26ft Box', 2021, 158900, 'Ready for Sale', 46200.00, 'Atlanta, GA', DATEADD(DAY, -40, SYSUTCDATETIME())),
('TRK-10512', '1HTMMSAN4LH482103', 'International', 'MV607 24ft Box Truck', 2020, 185400, 'Pending Inspection', 39900.00, 'Chicago, IL', DATEADD(DAY, -12, SYSUTCDATETIME())),
('TRK-10550', '1FDNE3FN9MDC10294', 'Ford', 'F-650 Super Duty 26ft Box', 2022, 98400, 'Ready for Sale', 56900.00, 'Phoenix, AZ', DATEADD(DAY, -20, SYSUTCDATETIME())),
('TRK-10588', '1NPAL40X8KD739201', 'Peterbilt', '337 Medium Duty Flatbed', 2019, 215000, 'Under Maintenance', 42000.00, 'Denver, CO', DATEADD(DAY, -30, SYSUTCDATETIME())),
('TRK-10601', '1FVACWFC6KH901243', 'Freightliner', 'M2 106 Reefer Truck', 2021, 164000, 'Ready for Sale', 62500.00, 'Los Angeles, CA', DATEADD(DAY, -15, SYSUTCDATETIME())),
('TRK-10615', '1HTMMSAL8MH391024', 'International', 'DuraStar 4300 Box Truck', 2018, 240500, 'Sold', 28500.00, 'Dallas, TX', DATEADD(DAY, -90, SYSUTCDATETIME())),

-- Commercial Cargo & Delivery Vans
('VAN-20101', '1FTBR1Y85NKA48201', 'Ford', 'Transit-350 High Roof Extended', 2022, 64200, 'Ready for Sale', 38750.00, 'Atlanta, GA', DATEADD(DAY, -18, SYSUTCDATETIME())),
('VAN-20102', '1FTBR1Y88NKA48202', 'Ford', 'Transit-350 Cargo Van', 2022, 71500, 'Ready for Sale', 36900.00, 'Charlotte, NC', DATEADD(DAY, -25, SYSUTCDATETIME())),
('VAN-20240', 'WD3PE8CD8NP201948', 'Mercedes-Benz', 'Sprinter 2500 High Roof', 2021, 88200, 'Ready for Sale', 44500.00, 'Dallas, TX', DATEADD(DAY, -10, SYSUTCDATETIME())),
('VAN-20241', 'WD3PE8CD2NP201949', 'Mercedes-Benz', 'Sprinter 2500 Cargo', 2020, 112400, 'Pending Inspection', 37200.00, 'Los Angeles, CA', DATEADD(DAY, -5, SYSUTCDATETIME())),
('VAN-20310', '3C6URVFG6NE193840', 'Ram', 'ProMaster 3500 High Roof', 2022, 59100, 'Ready for Sale', 34500.00, 'Phoenix, AZ', DATEADD(DAY, -8, SYSUTCDATETIME())),
('VAN-20315', '3C6URVFG1NE193841', 'Ram', 'ProMaster 2500 Low Roof', 2021, 92000, 'Sold', 26800.00, 'Chicago, IL', DATEADD(DAY, -60, SYSUTCDATETIME())),

-- Car Haulers & Heavy Transporters
('HAU-30010', '1XP4DB9X9LD849201', 'Peterbilt', '389 Heavy Duty 3-Car Hauler', 2020, 310000, 'Ready for Sale', 119500.00, 'Dallas, TX', DATEADD(DAY, -35, SYSUTCDATETIME())),
('HAU-30022', '3AKJHHDR5LSKL9821', 'Freightliner', 'Cascadia 126 Cottrell 9-Car', 2019, 440000, 'Pending Inspection', 145000.00, 'Atlanta, GA', DATEADD(DAY, -14, SYSUTCDATETIME())),
('HAU-30045', '4V4NC9EJ8KN892014', 'Volvo', 'VNL 760 Kaufman 4-Car Rig', 2021, 275000, 'Ready for Sale', 134000.00, 'Phoenix, AZ', DATEADD(DAY, -22, SYSUTCDATETIME())),
('HAU-30050', '1XKAD49X4KJ392810', 'Kenworth', 'T680 Auto Transporter', 2018, 510000, 'Sold', 89000.00, 'Los Angeles, CA', DATEADD(DAY, -75, SYSUTCDATETIME())),
('HAU-30060', '1XP4DB9X2MD849202', 'Peterbilt', '579 Sun Country 5-Car Wedge', 2022, 195000, 'Ready for Sale', 158000.00, 'Denver, CO', DATEADD(DAY, -7, SYSUTCDATETIME()));

PRINT 'Seeding SalesOrders history...';

-- Seed Sales Orders linked to the sold units
INSERT INTO dbo.SalesOrders 
(
    OrderNumber, BuyerName, UnitId, SalePrice, SaleDate, Notes, CreatedBy
)
VALUES
('SO-202602-00192', 'Apex Logistics Midwest LLC', 7, 27500.00, DATEADD(DAY, -20, SYSUTCDATETIME()), 'Sold via wholesale broker. Paid in full via wire.', 'admin@fleettrack.io'),
('SO-202603-00214', 'Swift Courier & Parcel Delivery', 13, 26000.00, DATEADD(DAY, -3, SYSUTCDATETIME()), 'Fleet addition for Chicago route. Financed via Commercial Credit.', 'sales_desk@fleettrack.io'),
('SO-202601-00105', 'Lone Star Auto Transport Corp', 17, 86500.00, DATEADD(DAY, -45, SYSUTCDATETIME()), 'Export unit to regional terminal. Inspection completed prior to handoff.', 'operations@fleettrack.io');

PRINT 'Database seeding completed successfully.';
GO
