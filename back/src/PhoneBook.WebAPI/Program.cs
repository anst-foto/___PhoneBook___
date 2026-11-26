using System;
using System.Collections.Generic;
using System.Threading;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

using PhoneBook.Lib;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("PhoneBook")
                       ?? throw new InvalidOperationException("Строка подключения к БД 'PhoneBook' не найдена.");
builder.Services.AddSingleton(new PhoneBookRepo(connectionString));

builder.Services.AddProblemDetails();

builder.Services.AddHealthChecks()
    .AddNpgSql(
        connectionString: connectionString,
        name: "postgresql",
        tags: ["ready"]);

var app = builder.Build();

var phoneBook = app.MapGroup("/api/phonebook");

phoneBook.MapGet("/", async (PhoneBookRepo repo, CancellationToken ct) =>
{
    try
    {
        var result = await repo.GetAllAsync(ct);
            return Results.Ok(result);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

phoneBook.MapPost("/", async (
    PhoneBookRepo repo,
    CreatePhoneBookItemRequest request,
    CancellationToken ct) =>
{
    var errors = new Dictionary<string, string[]>();
    if (string.IsNullOrWhiteSpace(request.Name))
        errors["name"] = ["Имя не может быть пустым."];
    if (string.IsNullOrWhiteSpace(request.Phone))
        errors["phone"] = ["Телефон не может быть пустым."];
    if (errors.Count > 0)
        return Results.ValidationProblem(errors);

    int id = await repo.AddAsync(request.Name, request.Phone, ct);
    return Results.Created($"/api/phonebook/{id}", new { id });
});

app.MapHealthChecks("/health", new HealthCheckOptions
{
    Predicate = _ => false
});

app.MapHealthChecks("/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

await app.RunAsync();

public sealed record CreatePhoneBookItemRequest(string Name, string Phone);
