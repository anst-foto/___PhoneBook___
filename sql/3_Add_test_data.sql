WITH new_persons AS (
    INSERT INTO table_persons (name)
    VALUES
        ('Анна Смирнова'),
        ('Иван Петров'),
        ('Мария Иванова')
    RETURNING id, name
)
INSERT INTO table_phones (person_id, number)
SELECT p.id, v.number
FROM new_persons AS p
JOIN (
    VALUES
        ('Анна Смирнова', '+7-000-000-00-01'),
        ('Анна Смирнова', '+7-000-000-00-02'),
        ('Иван Петров',   '+7-000-000-00-03'),
        ('Мария Иванова', '+7-000-000-00-04')
) AS v(name, number)
    ON v.name = p.name;