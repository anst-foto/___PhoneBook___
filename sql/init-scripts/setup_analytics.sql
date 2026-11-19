set time zone 'Europe/Moscow';

-- CREATE EXTENSION pg_stat_statements for query analytics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Grant permissions
GRANT EXECUTE ON FUNCTION pg_stat_statements(IN boolean) TO CURRENT_USER;

-- Reset statements to start fresh monitoring
SELECT pg_stat_statements_reset();
