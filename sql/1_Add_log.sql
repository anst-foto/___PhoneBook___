-- Аудит DDL/DML для PostgreSQL.
-- DDL-аудит требует прав суперпользователя.
-- DML-аудит автоматически подключается к существующим и новым таблицам
-- в схемах, разрешённых через log.schema_filter.

CREATE SCHEMA log;
REVOKE ALL ON SCHEMA log FROM PUBLIC;

SET TIME ZONE 'Europe/Moscow';

-- Фильтр схем: exclude исключает схему; если есть хотя бы один include,
-- журналируются только перечисленные include-схемы (кроме системных).
CREATE TYPE log.schema_filter_action AS ENUM ('include', 'exclude');

CREATE TABLE log.schema_filter
(
    schema_name TEXT NOT NULL PRIMARY KEY,
    action      log.schema_filter_action NOT NULL
);

INSERT INTO log.schema_filter (schema_name, action) VALUES
    ('log', 'exclude'),
    ('information_schema', 'exclude'),
    ('pg_catalog', 'exclude'),
    ('pg_toast', 'exclude');

CREATE OR REPLACE FUNCTION log.is_audited_schema(p_schema TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, log
AS $$
    SELECT CASE
        -- Объекты без привязки к схеме (например, некоторые глобальные DDL)
        -- оставляем в DDL-журнале.
        WHEN p_schema IS NULL THEN TRUE
        -- Включая pg_temp_N и pg_toast_N.
        WHEN left(p_schema, 3) = 'pg_' OR p_schema = 'information_schema' THEN FALSE
        WHEN EXISTS (
            SELECT 1
            FROM log.schema_filter
            WHERE schema_name = p_schema AND action = 'exclude'
        ) THEN FALSE
        WHEN EXISTS (
            SELECT 1 FROM log.schema_filter WHERE action = 'include'
        ) THEN EXISTS (
            SELECT 1
            FROM log.schema_filter
            WHERE schema_name = p_schema AND action = 'include'
        )
        ELSE TRUE
    END;
$$;

CREATE TYPE log.type_event AS ENUM ('СОЗДАНИЕ', 'УДАЛЕНИЕ');
CREATE TYPE log.type_operation AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');

CREATE TABLE log.table_ddl_logs
(
    id           SERIAL NOT NULL PRIMARY KEY,
    date_action  DATE NOT NULL DEFAULT current_date,
    time_action  TIME NOT NULL DEFAULT current_time,
    client_ip    INET,
    user_name    TEXT NOT NULL,
    event_type   log.type_event,
    object_type  TEXT,
    schema_name  TEXT,
    object_name  TEXT NOT NULL,
    -- Здесь хранится фаза event trigger: ddl_command_end или sql_drop.
    command      TEXT,
    -- Здесь хранится фактический PostgreSQL command tag, например CREATE TABLE.
    command_tag  TEXT,
    command_text TEXT
);

CREATE TABLE log.table_dml_logs
(
    id             BIGSERIAL NOT NULL PRIMARY KEY,
    schema_name    TEXT NOT NULL,
    table_name     TEXT NOT NULL,
    operation_type log.type_operation NOT NULL,
    date_operation DATE NOT NULL DEFAULT current_date,
    time_operation TIME NOT NULL DEFAULT current_time,
    user_name      TEXT NOT NULL,
    client_ip      INET,
    old_data       JSONB,
    new_data       JSONB
);

-- Построчное журналирование INSERT/UPDATE/DELETE.
CREATE OR REPLACE FUNCTION log.function_dml_logger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, log
AS $$
DECLARE
    old_row JSONB;
    new_row JSONB;
BEGIN
    IF NOT log.is_audited_schema(TG_TABLE_SCHEMA) THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        new_row := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        old_row := to_jsonb(OLD);
        new_row := to_jsonb(NEW);

        -- Не создаём запись, если данные строки фактически не изменились.
        IF old_row = new_row THEN
            RETURN NEW;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        old_row := to_jsonb(OLD);
    END IF;

    INSERT INTO log.table_dml_logs
        (schema_name, table_name, operation_type, user_name, client_ip, old_data, new_data)
    VALUES
        (TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP::log.type_operation,
         session_user, inet_client_addr(), old_row, new_row);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

-- TRUNCATE — отдельный statement-level trigger; он не может быть
-- объединён с построчными INSERT/UPDATE/DELETE в одном trigger.
CREATE OR REPLACE FUNCTION log.function_truncate_logger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, log
AS $$
BEGIN
    IF log.is_audited_schema(TG_TABLE_SCHEMA) THEN
        INSERT INTO log.table_dml_logs
            (schema_name, table_name, operation_type, user_name, client_ip)
        VALUES
            (TG_TABLE_SCHEMA, TG_TABLE_NAME, 'TRUNCATE', session_user, inet_client_addr());
    END IF;
    RETURN NULL;
END;
$$;

-- Устанавливает оба DML-триггера на таблицу, если схема проходит фильтр.
CREATE OR REPLACE FUNCTION log.attach_table_audit(p_table_oid OID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, log
AS $$
DECLARE
    v_schema_name TEXT;
    v_table_name  TEXT;
    v_relkind     "char";
    v_is_partition BOOLEAN;
BEGIN
    SELECT n.nspname, c.relname, c.relkind, c.relispartition
      INTO v_schema_name, v_table_name, v_relkind, v_is_partition
      FROM pg_catalog.pg_class AS c
      JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
     WHERE c.oid = p_table_oid;

    IF NOT FOUND
       OR v_relkind NOT IN ('r', 'p')
       OR v_is_partition
       OR NOT log.is_audited_schema(v_schema_name)
    THEN
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_trigger
        WHERE tgrelid = p_table_oid
          AND tgname = 'audit_row_change'
          AND NOT tgisinternal
    ) THEN
        EXECUTE format(
            'CREATE TRIGGER audit_row_change
             AFTER INSERT OR UPDATE OR DELETE ON %I.%I
             FOR EACH ROW EXECUTE FUNCTION log.function_dml_logger()',
            v_schema_name, v_table_name
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_trigger
        WHERE tgrelid = p_table_oid
          AND tgname = 'audit_truncate'
          AND NOT tgisinternal
    ) THEN
        EXECUTE format(
            'CREATE TRIGGER audit_truncate
             AFTER TRUNCATE ON %I.%I
             FOR EACH STATEMENT EXECUTE FUNCTION log.function_truncate_logger()',
            v_schema_name, v_table_name
        );
    END IF;
END;
$$;

-- DDL: все команды ddl_command_end намеренно остаются типом «СОЗДАНИЕ»,
-- как в исходном варианте; удаление отдельно ловится на sql_drop.
CREATE OR REPLACE FUNCTION log.function_ddl_logger()
RETURNS EVENT_TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, log
AS $$
DECLARE
    command_record RECORD;
    dropped_record RECORD;
BEGIN
    IF TG_EVENT = 'sql_drop' THEN
        FOR dropped_record IN
            SELECT * FROM pg_catalog.pg_event_trigger_dropped_objects()
        LOOP
            IF log.is_audited_schema(dropped_record.schema_name) THEN
                INSERT INTO log.table_ddl_logs
                    (client_ip, user_name, event_type, object_type, schema_name,
                     object_name, command, command_tag, command_text)
                VALUES
                    (inet_client_addr(), session_user, 'УДАЛЕНИЕ',
                     dropped_record.object_type, dropped_record.schema_name,
                     COALESCE(dropped_record.object_identity, dropped_record.object_name),
                     TG_TAG, TG_TAG, current_query());
            END IF;
        END LOOP;
        RETURN;
    END IF;

    FOR command_record IN
        SELECT * FROM pg_catalog.pg_event_trigger_ddl_commands()
    LOOP
        IF log.is_audited_schema(command_record.schema_name) THEN
            INSERT INTO log.table_ddl_logs
                (client_ip, user_name, event_type, object_type, schema_name,
                 object_name, command, command_tag, command_text)
            VALUES
                (inet_client_addr(), session_user, 'СОЗДАНИЕ',
                 command_record.object_type, command_record.schema_name,
                 command_record.object_identity, TG_EVENT, TG_TAG, current_query());
        END IF;

        -- Автоматически подключаем аудит к новым обычным и partitioned tables.
        IF command_record.object_type = 'table'
           AND command_record.objid <> 0
           AND log.is_audited_schema(command_record.schema_name)
        THEN
            PERFORM log.attach_table_audit(command_record.objid);
        END IF;
    END LOOP;
END;
$$;

CREATE EVENT TRIGGER trigger_ddl_log_create
    ON ddl_command_end
    EXECUTE FUNCTION log.function_ddl_logger();

CREATE EVENT TRIGGER trigger_ddl_log_drop
    ON sql_drop
    EXECUTE FUNCTION log.function_ddl_logger();

-- Подключаем аудит и к таблицам, которые существовали до установки аудита.
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN
        SELECT c.oid
        FROM pg_catalog.pg_class AS c
        JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
        WHERE c.relkind IN ('r', 'p')
          AND NOT c.relispartition
          AND log.is_audited_schema(n.nspname)
    LOOP
        PERFORM log.attach_table_audit(table_record.oid);
    END LOOP;
END;
$$;

-- При наличии хотя бы одного include, например:
-- INSERT INTO log.schema_filter (schema_name, action)
-- VALUES ('public', 'include');
-- тогда аудит будет ограничен перечисленными include-схемами.
