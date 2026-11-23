using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Dapper;

using Npgsql;

using PhoneBook.Lib.Models;

namespace PhoneBook.Lib;

public class PhoneBookRepo
{
    private readonly string _connectionString;

    public PhoneBookRepo(string connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new ArgumentNullException(nameof(connectionString));

        _connectionString = connectionString;

        Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;
    }

    public async Task<IReadOnlyCollection<PhoneBookItem>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        const string sql = "SELECT * FROM view_phonebook";
        var result = await connection.QueryAsync<PhoneBookItem>(sql, cancellationToken);

        return result.AsList();
    }

    public async Task<int> AddAsync(string name, string phone, CancellationToken cancellationToken = default)
    {
        var trimmedName = name.Trim();
        var trimmedPhone = phone.Trim();

        if (string.IsNullOrWhiteSpace(trimmedName))
            throw new ArgumentNullException(nameof(name));

        if (string.IsNullOrWhiteSpace(trimmedPhone))
            throw new ArgumentNullException(nameof(phone));

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        const string sql = """
                           WITH inserted_person AS (
                               INSERT INTO table_persons (name)
                               VALUES (@name)
                               RETURNING id
                           )
                           INSERT INTO table_phones (person_id, number)
                           SELECT id, @number FROM inserted_person
                           RETURNING person_id
                           """;

        var personId = await connection.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, new { name = trimmedName, number = trimmedPhone },
                cancellationToken: cancellationToken));

        return personId;
    }
}
