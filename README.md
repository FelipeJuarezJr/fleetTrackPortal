# FleetTrack & Sales Portal - Enterprise Proof of Concept

[![.NET 8](https://img.shields.io/badge/.NET-8.0-blue.svg)](https://dotnet.microsoft.com/)
[![Azure App Service](https://img.shields.io/badge/Azure-App%20Service-0078D4.svg)](https://azure.microsoft.com/services/app-service/)
[![Azure SQL](https://img.shields.io/badge/Database-Azure%20SQL-CC292B.svg)](https://azure.microsoft.com/products/azure-sql/database/)
[![Dapper](https://img.shields.io/badge/Data%20Access-Dapper%20%2F%20SqlClient-5C2D91.svg)](https://github.com/DapperLib/Dapper)

A high-concurrency commercial fleet inventory and transactional sales order portal engineered for enterprise resilience, direct relational query performance, and cloud readiness on **Azure App Service** and **Azure SQL Database**.

---

## 🏗️ Architecture & Tech Stack

```
                                  ┌───────────────────────────────────────────────┐
                                  │           Azure App Service (.NET 8)          │
                                  │                                               │
┌──────────────────────────┐      │  ┌────────────────────┐ ┌───────────────────┐ │
│  Client Browser          │◄────┼──┤ MVC Razor Views     │ │ WebAPI Controller │ │
│  (HTML5 + CSS + jQuery)  │ AJAX│  │ (Server Admin Shell)│ │ (/api/fleet,      │ │
└──────────────────────────┘      │  └────────────────────┘ │  /api/orders)     │ │
                                  │            │            └─────────┬─────────┘ │
                                  │            ▼                      ▼           │
                                  │  ┌──────────────────────────────────────────┐ │
                                  │  │ IFleetRepository (FleetTrack.Core)       │ │
                                  │  └────────────────────┬─────────────────────┘ │
                                  │                       ▼                       │
                                  │  ┌──────────────────────────────────────────┐ │
                                  │  │ Dapper / Microsoft.Data.SqlClient        │ │
                                  │  │ (FleetTrack.Infrastructure)              │ │
                                  │  └────────────────────┬─────────────────────┘ │
                                  └───────────────────────┼───────────────────────┘
                                                          │ Parameterized TDS (1433)
                                                          ▼
                                  ┌───────────────────────────────────────────────┐
                                  │            Azure SQL Database                 │
                                  │                                               │
                                  │  • FleetUnits (Clustered & Nonclustered IX)   │
                                  │  • SalesOrders (Relational FK & Unique UQ)    │
                                  │  • sp_GetAvailableFleetUnits                  │
                                  │  • sp_CreateSalesOrder (UPDLOCK Transaction)  │
                                  │  • sp_GetFleetSummaryKpis                     │
                                  └───────────────────────────────────────────────┘
```

- **Backend:** C# (.NET 8 / ASP.NET Core)
  - **Hybrid MVC + WebAPI:** Razor views for the administrative shell; JSON endpoints under `/api/fleet` and `/api/orders` for real-time asynchronous grid operations.
  - **Application Insights Telemetry:** End-to-end distributed tracing, query duration tracking, and HTTP request telemetry.
- **Frontend:** Responsive enterprise dashboard design system, modern HTML5, Vanilla CSS custom properties, and jQuery 3.7.1 for debounced search, asynchronous DOM manipulation, and modals.
- **Data Layer:** `Microsoft.Data.SqlClient` and `Dapper` executing parameterized T-SQL and stored procedures (zero ORM overhead, full parameter binding eliminating SQL injection risks).
- **Relational Integrity & Concurrency:** `sp_CreateSalesOrder` executes with `SET XACT_ABORT ON` and `UPDLOCK, ROWLOCK` to prevent double-selling inventory under concurrent operations.

---

## 📁 Repository Structure

```
fleetInventoryGrid/
├── FleetTrackPortal.sln                 # Root Visual Studio Solution
├── README.md                            # Architecture & Deployment Guide
├── database/                            # T-SQL Scripts & Database Definitions
│   ├── 01_schema.sql                    # FleetUnits & SalesOrders tables with constraints
│   ├── 02_stored_procedures.sql         # sp_GetAvailableFleetUnits, sp_CreateSalesOrder, sp_GetFleetSummaryKpis
│   └── 03_seed_data.sql                 # Realistic commercial fleet inventory & past orders
└── src/
    ├── FleetTrack.Core/                 # Domain Layer
    │   ├── Dtos/                        # SalesOrderCreateDto, FleetFilterDto, ApiResponse
    │   ├── Interfaces/                  # IFleetRepository contract
    │   └── Models/                      # FleetUnit, SalesOrder, FleetSummaryKpis
    ├── FleetTrack.Infrastructure/       # Data Access Layer
    │   ├── Repositories/                # FleetRepository (SqlClient / Dapper)
    │   └── DependencyInjection.cs       # Service registration extensions
    └── FleetTrack.Web/                  # Presentation & API Layer
        ├── Controllers/                 # FleetController (MVC) & Api/FleetApiController
        ├── ViewModels/                  # FleetDashboardViewModel
        ├── Views/                       # Razor Views (Index, Layout, Error)
        ├── wwwroot/                     # Static assets (site.css, fleet-portal.js)
        ├── appsettings.json             # Production & Azure configuration
        └── Program.cs                   # App bootstrapper & middleware pipeline
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- SQL Server 2019+, Azure SQL Edge, or SQL Server LocalDB

### 1. Database Setup
Execute the T-SQL scripts in order against your target SQL Server database (`FleetTrackDb`):

```bash
# Using sqlcmd utility (replace with your server and credentials)
sqlcmd -S localhost -d master -Q "CREATE DATABASE FleetTrackDb;"
sqlcmd -S localhost -d FleetTrackDb -i ./database/01_schema.sql
sqlcmd -S localhost -d FleetTrackDb -i ./database/02_stored_procedures.sql
sqlcmd -S localhost -d FleetTrackDb -i ./database/03_seed_data.sql
```
*(Or open and run `01_schema.sql`, `02_stored_procedures.sql`, and `03_seed_data.sql` directly inside SSMS or Azure Data Studio).*

### 2. Configure Connection String
Edit `src/FleetTrack.Web/appsettings.Development.json` or `appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=FleetTrackDb;Trusted_Connection=True;TrustServerCertificate=True;"
  }
}
```

### 3. Run the Application
```bash
# Restore and run the Web presentation project
dotnet run --project src/FleetTrack.Web/FleetTrack.Web.csproj
```
Open your browser and navigate to: `https://localhost:5001` or `http://localhost:5000`.

---

## ☁️ Azure Cloud Deployment

Deploy the full stack directly to Azure via the Azure CLI (`az`).

### 1. Azure SQL Database Provisioning

```bash
# 1. Variables
RESOURCE_GROUP="rg-fleettrack-prod"
LOCATION="eastus"
SQL_SERVER="sql-fleettrack-$RANDOM"
SQL_DB="FleetTrackDb"
ADMIN_USER="sqladmin"
ADMIN_PASS="P@ssw0rdSecure2026!"

# 2. Create Resource Group
az group create --name $RESOURCE_GROUP --location $LOCATION

# 3. Create Azure SQL Server
az sql server create \
    --name $SQL_SERVER \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --admin-user $ADMIN_USER \
    --admin-password $ADMIN_PASS

# 4. Allow Azure Services & App Service to access SQL Server
az sql server firewall-rule create \
    --resource-group $RESOURCE_GROUP \
    --server $SQL_SERVER \
    --name "AllowAzureServices" \
    --start-ip-address 0.0.0.0 \
    --end-ip-address 0.0.0.0

# 5. Create Azure SQL Database (Serverless or Basic Tier)
az sql db create \
    --resource-group $RESOURCE_GROUP \
    --server $SQL_SERVER \
    --name $SQL_DB \
    --service-objective "Basic"

# 6. Construct Connection String
AZURE_SQL_CONN="Server=tcp:${SQL_SERVER}.database.windows.net,1433;Initial Catalog=${SQL_DB};Persist Security Info=False;User ID=${ADMIN_USER};Password=${ADMIN_PASS};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
```

Run the database scripts (`01_schema.sql`, `02_stored_procedures.sql`, `03_seed_data.sql`) using Azure Data Studio or Query Editor in the Azure Portal against the provisioned Azure SQL Database.

---

### 2. Azure App Service Provisioning & Deployment

Deploy the web application to Azure App Service:

```bash
# 1. Variables
APP_NAME="fleettrack-portal-$RANDOM"
PLAN_NAME="plan-fleettrack-free"

# 2. Create Free App Service Plan (F1 tier)
az appservice plan create \
    --name $PLAN_NAME \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --sku F1 \
    --is-linux

# 3. Create Web App with .NET 8 Runtime
az webapp create \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --plan $PLAN_NAME \
    --runtime "DOTNETCORE:8.0"

# 4. Create Application Insights Component
az extension add -n application-insights
az monitor app-insights component create \
    --app "appinsights-fleettrack" \
    --location $LOCATION \
    --resource-group $RESOURCE_GROUP \
    --application-type web

APPINSIGHTS_KEY=$(az monitor app-insights component show \
    --app "appinsights-fleettrack" \
    --resource-group $RESOURCE_GROUP \
    --query connectionString -o tsv)

# 5. Configure App Settings & Connection Strings in App Service
az webapp config appsettings set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings APPLICATIONINSIGHTS_CONNECTION_STRING="$APPINSIGHTS_KEY" ASPNETCORE_ENVIRONMENT="Production"

az webapp config connection-string set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --connection-string-type SQLAzure \
    --settings DefaultConnection="$AZURE_SQL_CONN"

# 6. Publish & Deploy Code
dotnet publish src/FleetTrack.Web/FleetTrack.Web.csproj -c Release -o ./publish
cd ./publish && zip -r ../deploy.zip . && cd ..

az webapp deploy \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --src-path ./deploy.zip \
    --type zip

echo "Portal deployed to: https://${APP_NAME}.azurewebsites.net"
```

---

## 🔒 Security & Concurrency Design

1. **SQL Injection Elimination:**
   All queries route through parameterized stored procedures (`sp_GetAvailableFleetUnits`, `sp_CreateSalesOrder`, `sp_GetFleetSummaryKpis`). No dynamic SQL string concatenations exist.

2. **Atomic Order Commit & Row-Level Locking:**
   Inside `sp_CreateSalesOrder`:
   ```sql
   BEGIN TRANSACTION;
   -- Locks target unit row to prevent concurrent race condition purchase
   SELECT @CurrentStatus = ConditionStatus FROM dbo.FleetUnits WITH (UPDLOCK, ROWLOCK) WHERE UnitId = @UnitId;
   
   IF @CurrentStatus = 'Sold'
       RAISERROR('Fleet unit has already been sold.', 16, 1);

   INSERT INTO dbo.SalesOrders (...) VALUES (...);
   UPDATE dbo.FleetUnits SET ConditionStatus = 'Sold', UpdatedDate = SYSUTCDATETIME() WHERE UnitId = @UnitId;
   COMMIT TRANSACTION;
   ```

3. **Cloud Observability:**
   Azure Application Insights captures end-to-end dependency telemetry for every SQL call, failure rate, and API latency.
