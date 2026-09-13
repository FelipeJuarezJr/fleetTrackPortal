using System.Data;
using Dapper;
using FleetTrack.Core.Dtos;
using FleetTrack.Core.Interfaces;
using FleetTrack.Core.Models;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace FleetTrack.Infrastructure.Repositories;

/// <summary>
/// High-performance data access repository implementing raw ADO.NET / Dapper calls
/// against Azure SQL Database stored procedures and indexed queries.
/// </summary>
public class FleetRepository : IFleetRepository
{
    private readonly string _connectionString;
    private readonly ILogger<FleetRepository> _logger;

    public FleetRepository(IConfiguration configuration, ILogger<FleetRepository> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _connectionString = configuration.GetConnectionString("DefaultConnection") 
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not configured in appsettings.json.");
    }

    private SqlConnection CreateConnection() => new SqlConnection(_connectionString);

    /// <inheritdoc />
    public async Task<IEnumerable<FleetUnit>> GetFleetUnitsAsync(FleetFilterDto filter, CancellationToken cancellationToken = default)
    {
        try
        {
            await using var connection = CreateConnection();
            var parameters = new DynamicParameters();
            parameters.Add("@Location", string.IsNullOrWhiteSpace(filter.Location) ? null : filter.Location.Trim(), DbType.String);
            parameters.Add("@ConditionStatus", string.IsNullOrWhiteSpace(filter.ConditionStatus) ? null : filter.ConditionStatus.Trim(), DbType.String);
            parameters.Add("@SearchTerm", string.IsNullOrWhiteSpace(filter.SearchTerm) ? null : filter.SearchTerm.Trim(), DbType.String);

            var command = new CommandDefinition(
                "dbo.sp_GetAvailableFleetUnits",
                parameters,
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken);

            _logger.LogInformation("Executing sp_GetAvailableFleetUnits with Location='{Location}', Status='{Status}', Search='{Search}'", 
                filter.Location, filter.ConditionStatus, filter.SearchTerm);

            var units = await connection.QueryAsync<FleetUnit>(command);
            return units;
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "SQL error occurred while querying fleet units.");
            throw new ApplicationException($"Database query failed: {ex.Message}", ex);
        }
    }

    /// <inheritdoc />
    public async Task<FleetUnit?> GetFleetUnitByIdAsync(int unitId, CancellationToken cancellationToken = default)
    {
        try
        {
            await using var connection = CreateConnection();
            var parameters = new DynamicParameters();
            parameters.Add("@UnitId", unitId, DbType.Int32);

            var command = new CommandDefinition(
                "dbo.sp_GetFleetUnitById",
                parameters,
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken);

            return await connection.QuerySingleOrDefaultAsync<FleetUnit>(command);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "SQL error fetching fleet unit with ID {UnitId}", unitId);
            throw new ApplicationException($"Database lookup failed: {ex.Message}", ex);
        }
    }

    /// <inheritdoc />
    public async Task<SalesOrder> CreateSalesOrderAsync(SalesOrderCreateDto dto, string createdBy, CancellationToken cancellationToken = default)
    {
        try
        {
            await using var connection = CreateConnection();
            var parameters = new DynamicParameters();
            parameters.Add("@UnitId", dto.UnitId, DbType.Int32);
            parameters.Add("@BuyerName", dto.BuyerName.Trim(), DbType.String);
            parameters.Add("@SalePrice", dto.SalePrice, DbType.Decimal);
            parameters.Add("@Notes", string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(), DbType.String);
            parameters.Add("@OrderNumber", string.IsNullOrWhiteSpace(dto.CustomOrderNumber) ? null : dto.CustomOrderNumber.Trim(), DbType.String);
            parameters.Add("@CreatedBy", string.IsNullOrWhiteSpace(createdBy) ? "PortalUser" : createdBy, DbType.String);

            var command = new CommandDefinition(
                "dbo.sp_CreateSalesOrder",
                parameters,
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken);

            _logger.LogInformation("Executing sp_CreateSalesOrder for UnitId={UnitId}, Buyer='{BuyerName}', Price={SalePrice}", 
                dto.UnitId, dto.BuyerName, dto.SalePrice);

            var order = await connection.QuerySingleOrDefaultAsync<SalesOrder>(command);
            if (order == null)
            {
                throw new InvalidOperationException("Failed to generate sales order from stored procedure output.");
            }

            return order;
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "SQL transaction failed while creating sales order for UnitId {UnitId}: {Message}", dto.UnitId, ex.Message);
            throw new InvalidOperationException(ex.Message, ex);
        }
    }

    /// <inheritdoc />
    public async Task<FleetSummaryKpis> GetFleetSummaryKpisAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await using var connection = CreateConnection();
            var command = new CommandDefinition(
                "dbo.sp_GetFleetSummaryKpis",
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken);

            var kpis = await connection.QuerySingleOrDefaultAsync<FleetSummaryKpis>(command);
            return kpis ?? new FleetSummaryKpis();
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "SQL error calculating fleet KPI summary.");
            throw new ApplicationException($"KPI computation failed: {ex.Message}", ex);
        }
    }

    /// <inheritdoc />
    public async Task<IEnumerable<string>> GetDistinctLocationsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await using var connection = CreateConnection();
            const string sql = "SELECT DISTINCT CurrentLocation FROM dbo.FleetUnits WHERE CurrentLocation IS NOT NULL ORDER BY CurrentLocation ASC;";
            
            var command = new CommandDefinition(
                sql,
                commandType: CommandType.Text,
                cancellationToken: cancellationToken);

            return await connection.QueryAsync<string>(command);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "SQL error fetching distinct fleet locations.");
            return Enumerable.Empty<string>();
        }
    }
}
