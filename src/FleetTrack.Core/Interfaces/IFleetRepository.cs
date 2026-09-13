using FleetTrack.Core.Dtos;
using FleetTrack.Core.Models;

namespace FleetTrack.Core.Interfaces;

/// <summary>
/// Data access contract for high-performance direct SQL / Stored Procedure operations.
/// </summary>
public interface IFleetRepository
{
    /// <summary>
    /// Retrieves fleet units using sp_GetAvailableFleetUnits with optional filters.
    /// </summary>
    Task<IEnumerable<FleetUnit>> GetFleetUnitsAsync(FleetFilterDto filter, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves a single fleet unit by primary ID using sp_GetFleetUnitById.
    /// </summary>
    Task<FleetUnit?> GetFleetUnitByIdAsync(int unitId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Atomically executes sp_CreateSalesOrder to create an order and mark unit as sold.
    /// </summary>
    Task<SalesOrder> CreateSalesOrderAsync(SalesOrderCreateDto dto, string createdBy, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves real-time KPI metrics using sp_GetFleetSummaryKpis.
    /// </summary>
    Task<FleetSummaryKpis> GetFleetSummaryKpisAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves all distinct current locations for dropdown filters.
    /// </summary>
    Task<IEnumerable<string>> GetDistinctLocationsAsync(CancellationToken cancellationToken = default);
}
