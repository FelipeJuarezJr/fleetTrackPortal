using FleetTrack.Core.Models;

namespace FleetTrack.Web.ViewModels;

public class FleetDashboardViewModel
{
    public FleetSummaryKpis Kpis { get; set; } = new();
    public IEnumerable<string> AvailableLocations { get; set; } = Enumerable.Empty<string>();
    public IEnumerable<string> ConditionStatuses { get; set; } = new[]
    {
        "Ready for Sale",
        "Pending Inspection",
        "Under Maintenance",
        "Sold"
    };
    public string AppEnvironment { get; set; } = "Production";
    public string AzureRegion { get; set; } = "East US";
    public DateTime ServerTimeUtc { get; set; } = DateTime.UtcNow;
}
