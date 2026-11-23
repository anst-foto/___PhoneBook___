namespace PhoneBook.Lib.Models;

public class Phone
{
    public int Id { get; set; }
    public required int PersonId { get; init; }
    public required string Number { get; init; }
}
