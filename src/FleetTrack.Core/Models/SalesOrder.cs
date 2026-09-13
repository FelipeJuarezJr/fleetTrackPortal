namespace FleetTrack.Core.Models;

/// <summary>
/// Represents a finalized or executing sales transaction for a fleet vehicle.
/// </summary>
public class SalesOrder
{
    public int OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string BuyerName { get; set; } = string.Empty;
    public int UnitId { get; set; }
    public decimal SalePrice { get; set; }
    public DateTime SaleDate { get; set; }
    public string? Notes { get; set; }
    public string CreatedBy { get; set; } = "SystemPortal";

    // Linked Unit details returned by stored procedure
    public string? EquipmentNumber { get; set; }
    public string? Make { get; set; }
    public string? Model { get; set; }
    public int? Year { get; set; }
    public string? NewUnitStatus { get; set; }
}
