using System.Diagnostics;
using FleetTrack.Core.Interfaces;
using FleetTrack.Core.Models;
using FleetTrack.Web.ViewModels;
using Microsoft.AspNetCore.Mvc;

namespace FleetTrack.Web.Controllers;

/// <summary>
/// Server-rendered MVC controller providing the main shell for the FleetTrack portal.
/// </summary>
public class FleetController : Controller
{
    private readonly IFleetRepository _fleetRepository;
    private readonly ILogger<FleetController> _logger;
    private readonly IHostEnvironment _hostEnvironment;

    public FleetController(
        IFleetRepository fleetRepository,
        ILogger<FleetController> logger,
        IHostEnvironment hostEnvironment)
    {
        _fleetRepository = fleetRepository;
        _logger = logger;
        _hostEnvironment = hostEnvironment;
    }

    [HttpGet]
    public async Task<IActionResult> Index(CancellationToken cancellationToken)
    {
        var model = new FleetDashboardViewModel
        {
            AppEnvironment = _hostEnvironment.EnvironmentName,
            AzureRegion = Environment.GetEnvironmentVariable("REGION_NAME") ?? "Azure East US (App Service)",
            ServerTimeUtc = DateTime.UtcNow
        };

        try
        {
            model.Kpis = await _fleetRepository.GetFleetSummaryKpisAsync(cancellationToken);
            model.AvailableLocations = await _fleetRepository.GetDistinctLocationsAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Initial server-side DB load encountered an issue. Falling back to client-side AJAX hydration.");
            // View will gracefully render with zeroed KPIs and hydrate via client-side AJAX once DB is reachable
        }

        return View(model);
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}

public class ErrorViewModel
{
    public string? RequestId { get; set; }
    public bool ShowRequestId => !string.IsNullOrEmpty(RequestId);
}
