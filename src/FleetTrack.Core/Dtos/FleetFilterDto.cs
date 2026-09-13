namespace FleetTrack.Core.Dtos;

/// <summary>
/// Query filter parameters for inventory filtering and search.
/// </summary>
public class FleetFilterDto
{
    public string? Location { get; set; }
    public string? ConditionStatus { get; set; }
    public string? SearchTerm { get; set; }
}
