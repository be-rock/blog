---
title: "Sync Data With Lakebase Postgres"
date: 2026-06-03T11:12:06-05:00
draft: false
tags:
  - databricks
  - lakebase
  - postgres
---

An overview of how to get data into and out of Lakebase Postgres

---

## Overview

There are numerous options for getting data into and out of Lakebase Postgres. There are manual ways using `psql` scripts, a database driver such as `psycopg2` or `psycopg3`, and numerous others.

This post will focus on the Databricks managed service offerings.

---

## Setup

Create a basic Lakebase project using Terraform

```terraform
resource "databricks_postgres_project" "this" {
  project_id = "my-lakebase-project-1"
  spec = {
    pg_version   = 17
    display_name = "my-lakebase-project-1"
    default_endpoint_settings = {
      autoscaling_limit_min_cu = 0.5 # scale-to-zero floor (use 0 to allow full suspend)
      autoscaling_limit_max_cu = 2.0 # max compute units
      suspend_timeout_duration = "300s"
    }
    custom_tags = [
      {
        key   = "terraform_created"
        value = "true"
      },
      {
        key   = "environment"
        value = "dev"
      },
    ]
  }
}
```

Once the database is provisioned, you can setup a `playing_with_lakebase` table by going to the "SQL Editor" menu item in the UI and then clicking "Run" to create the table, insert some test data, and confirm the results

---

## Lakebase Change Data Feed (Lakebase --> Delta)

### Setup

#### Postgres Replica Identity

To sync Lakebase Postgres data to a Delta table, we need to enable `REPLICA IDENTITY FULL` at the table level:

```sql
ALTER TABLE playing_with_lakebase REPLICA IDENTITY FULL;
```

The [Postgres 17 `ALTER TABLE` docs](https://www.postgresql.org/docs/17/sql-altertable.html) describe it as:

>...changes the information which is written to the write-ahead log to identify rows which are updated or deleted. In most cases, the old value of each column is only logged if it differs from the new value; however, if the old value is stored externally, it is always logged regardless of whether it changed. This option has no effect except when logical replication is in use.

Here is how the `DEFAULT` and `FULL` `REPLICA IDENTITY` differ (bolded for emphasis):

- `DEFAULT` - Records the old values of the columns of the primary key, if any. This is the default for non-system tables.
- `FULL` - Records the old values of **all columns** in the row.

Querying the `relreplident` column in `pg_class` allows us to understand if a replica identity is set, and what type:

```sql
SELECT n.nspname AS table_schema,
       c.relname AS table_name,
       CASE c.relreplident
         WHEN 'd' THEN 'default'
         WHEN 'n' THEN 'nothing'
         WHEN 'f' THEN 'full'
         WHEN 'i' THEN 'index'
       END AS replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname = 'public'
ORDER BY n.nspname, c.relname;
```
[{
  "table_schema": "public",
  "table_name": "playing_with_lakebase",
  "replica_identity": "full"
}]

#### Lakebase CDF Enablement

- Open the Branch "Overview" section in the UI
- Click the "Lakebase CDF" tab
- Then click "Start"

You will then be prompted to choose the Lakebase source and the Unity Catalog destination.

- Source
    - Database: `databricks_postgres`
    - Schema: `public`
- Target
    - Catalog: `main`
    - Schema: `default`

The new table will be given an `lb_` prefix and `_history` suffix. So the final table name would loook something like: `lb_playing_with_lakebase_history`.

*NOTE* - This error is reported in Free Edition as of 2026-06-10. So it is not fully supported and cannot be fully tested
> The selected catalog uses Databricks-managed Default Storage, which is not supported for Lakebase CDF. Please select a catalog backed by external storage.

---

## Lakebase Synced tables (Delta --> Lakebase)

[Synced tables](https://docs.databricks.com/aws/en/oltp/projects/sync-tables) works as follows:

```
source_delta_table --> source_delta_table_sync --> source_delta_table_sync
  |                        |                                    |
  --> Original source      |                                    |
                           --> Read-only view of the table      |
                               (uses Lakehouse Federation)      --> The actual synced
                                                                    target Lakebase
                                                                    Postgres table
```

It's important to understand that this is *not* 3 copies of the same data but rather:

- Source data (Delta)
- A Unity Catalog view that uses Lakehouse Federation. See [Run federated queries on PostgreSQL](https://docs.databricks.com/aws/en/query-federation/postgresql)
- The target data (Postgres)

### Setup

In Databricks Lakehouse:

```sql
create or replace table delta_to_postgres_synced_table (c1 int, c2 string)
  TBLPROPERTIES (delta.enableChangeDataFeed = true);

insert into delta_to_postgres_synced_table
  values (1, 'test1'), (2, 'test2');
```

To provision the synced table:

```terraform
resource "databricks_postgres_synced_table" "this" {
  synced_table_id = "main.default.delta_to_postgres_synced"
  spec = {
    source_table_full_name             = "main.default.delta_to_postgres_synced_table"
    primary_key_columns                = ["id"]
    scheduling_policy                  = "TRIGGERED"
    postgres_database                  = "databricks_postgres"
    branch                             = "projects/my-lakebase-project-1/branches/production"
    create_database_objects_if_missing = true
    new_pipeline_spec = {
      storage_catalog = "main"
      storage_schema  = "default"
    }
  }
}
```

These options are a bit confusing on the surface, mainly:

```terraform
resource "databricks_postgres_synced_table" "this" {
...
  synced_table_id = "main.default.delta_to_postgres_synced"`
  ...
    source_table_full_name             = "main.default.delta_to_postgres_synced_table"`
  ...
```

According to the Terraform docs:
> The `synced_table_id` is the three-part Unity Catalog name: catalog.schema.table
> `source_table_full_name` (string, optional) - Three-part (catalog, schema, table) name of the source Delta table.

These descriptions are a bit redundant, in reality what I've observed is actually:

- `source_table_full_name` - is the *actual* source Delta table
- `synced_table_id` - the name of the federated table in UC under `main.default.delta_to_postgres_synced`

Finally, the Postgres table is found at `databricks_postgres.main.delta_to_postgres_synced`.

---

## Lakehouse Federation (query Lakebase from the Lakehouse)

Lakehouse Federation is used with the Synced Table above. In our specific example, the synced table was defined via `synced_table_id` and was named `main.default.delta_to_postgres_synced` but you don't need a Synced Table to use Lakehouse Federation, it's compatible with any cloud-based Postgres flavor, such as AWS RDS/Aurora.

### Setup

Setup is done by creating a connection:

```sql
CREATE CONNECTION <connection-name> TYPE postgresql
OPTIONS (
  host '<hostname>',
  port '<port>',
  user secret ('<secret-scope>','<secret-key-user>'),
  password secret ('<secret-scope>','<secret-key-password>')
)
```

...and then defining a Foreign Catalog in UC.

```sql
CREATE FOREIGN CATALOG [IF NOT EXISTS] <catalog-name>
USING CONNECTION <connection-name>
OPTIONS (database '<database-name>');
```