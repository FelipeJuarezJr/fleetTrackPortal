namespace FleetTrack.Core.Models;

/// <summary>
/// Represents a commercial fleet vehicle in inventory.
/// </summary>
public class FleetUnit
{
    public int UnitId { get; set; }
    public string EquipmentNumber { get; set; } = string.Empty;
    public string VIN { get; set; } = string.Empty;
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Year { get; set; }
    public int Mileage { get; set; }
    public string ConditionStatus { get; set; } = "Pending Inspection";
    public decimal AskingPrice { get; set; }
    public string CurrentLocation { get; set; } = string.Empty;
    public DateTime CreatedDate { get; set; }
    public DateTime? UpdatedDate { get; set; }

    // Optional navigational/join properties from stored procedures
    public string? LastOrderNumber { get; set; }
    public string? LastBuyerName { get; set; }
    public decimal? ActualSalePrice { get; set; }
    public DateTime? LastSaleDate { get; set; }
}
