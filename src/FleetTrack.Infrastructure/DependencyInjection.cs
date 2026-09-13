using FleetTrack.Core.Interfaces;
using FleetTrack.Infrastructure.Repositories;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace FleetTrack.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddFleetInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<IFleetRepository, FleetRepository>();
        return services;
    }
}
