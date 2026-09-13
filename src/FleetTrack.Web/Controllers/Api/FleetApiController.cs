using FleetTrack.Core.Dtos;
using FleetTrack.Core.Interfaces;
using FleetTrack.Core.Models;
using Microsoft.AspNetCore.Mvc;

namespace FleetTrack.Web.Controllers.Api;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class FleetApiController : ControllerBase
{
    private readonly IFleetRepository _fleetRepository;
    private readonly ILogger<FleetApiController> _logger;

    public FleetApiController(IFleetRepository fleetRepository, ILogger<FleetApiController> logger)
    {
        _fleetRepository = fleetRepository;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/fleet/available
    /// Retrieves fleet inventory with optional filtering by location, condition status, or search query.
    /// </summary>
    [HttpGet("available")]
    [HttpGet("/api/fleet")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<FleetUnit>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetAvailableUnits(
        [FromQuery] string? location,
        [FromQuery] string? status,
        [FromQuery] string? q,
        CancellationToken cancellationToken)
    {
        var filter = new FleetFilterDto
        {
            Location = location,
            ConditionStatus = status,
            SearchTerm = q
        };

        try
        {
            var units = await _fleetRepository.GetFleetUnitsAsync(filter, cancellationToken);
            return Ok(ApiResponse<IEnumerable<FleetUnit>>.Ok(units, $"Retrieved {units.Count()} fleet units"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve available fleet units with filters {@Filter}", filter);
            return StatusCode(StatusCodes.Status500InternalServerError, 
                ApiResponse<string>.Fail($"Failed to load fleet inventory: {ex.Message}"));
        }
    }

    /// <summary>
    /// GET /api/fleet/{id}
    /// Retrieves a single fleet unit by ID.
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<FleetUnit>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetUnitById(int id, CancellationToken cancellationToken)
    {
        try
        {
            var unit = await _fleetRepository.GetFleetUnitByIdAsync(id, cancellationToken);
            if (unit == null)
            {
                return NotFound(ApiResponse<string>.Fail($"Fleet unit with ID {id} was not found."));
            }

            return Ok(ApiResponse<FleetUnit>.Ok(unit));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving fleet unit with ID {UnitId}", id);
            return StatusCode(StatusCodes.Status500InternalServerError, 
                ApiResponse<string>.Fail($"Error retrieving unit: {ex.Message}"));
        }
    }

    /// <summary>
    /// GET /api/fleet/kpis
    /// Retrieves real-time dashboard KPIs.
    /// </summary>
    [HttpGet("kpis")]
    [ProducesResponseType(typeof(ApiResponse<FleetSummaryKpis>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetKpis(CancellationToken cancellationToken)
    {
        try
        {
            var kpis = await _fleetRepository.GetFleetSummaryKpisAsync(cancellationToken);
            return Ok(ApiResponse<FleetSummaryKpis>.Ok(kpis));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve fleet summary KPIs.");
            return StatusCode(StatusCodes.Status500InternalServerError, 
                ApiResponse<string>.Fail($"Failed to calculate KPIs: {ex.Message}"));
        }
    }

    /// <summary>
    /// POST /api/fleet/orders or POST /api/orders
    /// Atomically executes sp_CreateSalesOrder to record a purchase and transition unit to 'Sold'.
    /// </summary>
    [HttpPost("orders")]
    [HttpPost("/api/orders")]
    [ProducesResponseType(typeof(ApiResponse<SalesOrder>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> CreateSalesOrder([FromBody] SalesOrderCreateDto dto, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();

            return BadRequest(ApiResponse<string>.Fail("Validation failed", errors));
        }

        try
        {
            var operatorUser = HttpContext.User.Identity?.Name ?? "WebPortalOperator";
            var createdOrder = await _fleetRepository.CreateSalesOrderAsync(dto, operatorUser, cancellationToken);

            return CreatedAtAction(
                nameof(GetUnitById), 
                new { id = createdOrder.UnitId }, 
                ApiResponse<SalesOrder>.Ok(createdOrder, $"Sales Order {createdOrder.OrderNumber} successfully processed."));
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("already been sold", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Conflict while selling UnitId {UnitId}: {Message}", dto.UnitId, ex.Message);
            return Conflict(ApiResponse<string>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Business rule validation failed for UnitId {UnitId}: {Message}", dto.UnitId, ex.Message);
            return BadRequest(ApiResponse<string>.Fail(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error processing sales order for UnitId {UnitId}", dto.UnitId);
            return StatusCode(StatusCodes.Status500InternalServerError, 
                ApiResponse<string>.Fail($"Failed to create sales order: {ex.Message}"));
        }
    }

    /// <summary>
    /// GET /api/fleet/locations
    /// Returns distinct locations for filtering.
    /// </summary>
    [HttpGet("locations")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<string>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLocations(CancellationToken cancellationToken)
    {
        try
        {
            var locations = await _fleetRepository.GetDistinctLocationsAsync(cancellationToken);
            return Ok(ApiResponse<IEnumerable<string>>.Ok(locations));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load locations.");
            return StatusCode(StatusCodes.Status500InternalServerError, 
                ApiResponse<string>.Fail($"Error loading locations: {ex.Message}"));
        }
    }
}
