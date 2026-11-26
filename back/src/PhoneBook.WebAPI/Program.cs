using System;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

using PhoneBook.Lib;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("PhoneBook")
                       ?? throw new InvalidOperationException("Строка подключения к БД 'PhoneBook' не найдена.");
builder.Services.AddSingleton(new PhoneBookRepo(connectionString));

var app = builder.Build();

app.MapGet("/", async (PhoneBookRepo repo) => await repo.GetAllAsync());

await app.RunAsync();
