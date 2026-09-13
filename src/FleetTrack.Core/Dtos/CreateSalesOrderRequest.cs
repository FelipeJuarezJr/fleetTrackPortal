using System.ComponentModel.DataAnnotations;

namespace FleetTrack.Core.Dtos;

/// <summary>
/// Data Transfer Object representing the request payload for creating a sales order.
/// </summary>
public class CreateSalesOrderRequest
{
    [Required(ErrorMessage = "Fleet Unit ID is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "A valid Fleet Unit must be selected.")]
    public int UnitId { get; set; }

    [Required(ErrorMessage = "Buyer name is required.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Buyer name must be between 2 and 100 characters.")]
    public string BuyerName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Sale price is required.")]
    [Range(0.01, 10000000.00, ErrorMessage = "Sale price must be greater than zero.")]
    public decimal SalePrice { get; set; }

    [StringLength(2000, ErrorMessage = "Notes cannot exceed 2000 characters.")]
    public string? Notes { get; set; }

    [StringLength(30, ErrorMessage = "Custom Order Number cannot exceed 30 characters.")]
    public string? OrderNumber { get; set; }
}
