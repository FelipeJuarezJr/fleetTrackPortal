namespace FleetTrack.Core.Models;

/// <summary>
/// Aggregated real-time inventory and sales KPIs.
/// </summary>
public class FleetSummaryKpis
{
    public int TotalFleetUnits { get; set; }
    public int ReadyForSaleUnits { get; set; }
    public int PendingInspectionUnits { get; set; }
    public int UnderMaintenanceUnits { get; set; }
    public int TotalSoldUnits { get; set; }
    public decimal ActiveInventoryValuation { get; set; }
    public int UnitsSoldThisMonth { get; set; }
    public decimal SalesRevenueThisMonth { get; set; }
}
