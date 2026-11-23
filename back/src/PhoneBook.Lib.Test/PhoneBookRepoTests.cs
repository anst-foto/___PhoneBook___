using System;
using System.Threading.Tasks;

using Xunit;

namespace PhoneBook.Lib.Test;

public sealed class PhoneBookRepoTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fixture;

    public PhoneBookRepoTests(PostgresFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task GetAllAsync_WhenPhoneBookIsEmpty_ReturnsEmptyCollection()
    {
        await _fixture.ResetDatabaseAsync();
        var repository = new PhoneBookRepo(_fixture.ConnectionString);

        var result = await repository.GetAllAsync();

        Assert.Empty(result);
    }

    [Fact]
    public async Task AddAsync_TrimsValues_PersistsPhoneBookItem_AndReturnsPersonId()
    {
        await _fixture.ResetDatabaseAsync();
        var repository = new PhoneBookRepo(_fixture.ConnectionString);

        var personId = await repository.AddAsync("  Ada Lovelace  ", "  +1-555-0100  ");
        var result = await repository.GetAllAsync();

        var item = Assert.Single(result);
        Assert.Equal(personId, item.Id);
        Assert.Equal("Ada Lovelace", item.Name);
        Assert.Equal("+1-555-0100", item.PhoneNumber);
    }

    [Theory]
    [InlineData("   ", "+1-555-0100", "name")]
    [InlineData("Ada Lovelace", " \t ", "phone")]
    public async Task AddAsync_WhenNameOrPhoneIsBlank_ThrowsArgumentNullException(
        string name,
        string phone,
        string expectedParameterName)
    {
        await _fixture.ResetDatabaseAsync();
        var repository = new PhoneBookRepo(_fixture.ConnectionString);

        var exception = await Assert.ThrowsAsync<ArgumentNullException>(
            () => repository.AddAsync(name, phone));

        Assert.Equal(expectedParameterName, exception.ParamName);
    }
}
