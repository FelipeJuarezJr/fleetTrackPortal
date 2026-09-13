using System.Text.Json.Serialization;
using FleetTrack.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// 1. Configure Cloud Telemetry (Azure Application Insights)
builder.Services.AddApplicationInsightsTelemetry(options =>
{
    // Auto-picks up APPLICATIONINSIGHTS_CONNECTION_STRING from Azure App Service Environment Variables
    options.ConnectionString = builder.Configuration["ApplicationInsights:ConnectionString"]
                               ?? builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"];
    options.EnableAdaptiveSampling = true;
    options.EnableQuickPulseMetricStream = true;
});

// 2. Add Infrastructure & Data Access Layer
builder.Services.AddFleetInfrastructure(builder.Configuration);

// 3. Add Controllers with Razor Views and WebAPI support
builder.Services.AddControllersWithViews()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// 4. Add Routing configuration
builder.Services.AddRouting(options =>
{
    options.LowercaseUrls = true;
    options.LowercaseQueryStrings = true;
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Fleet/Error");
    app.UseHsts();
}
else
{
    app.UseDeveloperExceptionPage();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

// Map API Controllers (e.g., /api/fleet/...)
app.MapControllers();

// Map Default Razor MVC View Route
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Fleet}/{action=Index}/{id?}");

app.Run();
