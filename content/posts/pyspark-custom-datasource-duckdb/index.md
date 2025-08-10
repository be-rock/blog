---
title: "Building a Pyspark Custom Data Sources for DuckDB"
date: 2025-06-14T23:51:42-05:00
draft: false
showToc: true
tags:
    - duckdb
    - spark
---

## Summary

- Apache Spark 4.0 and Databricks 15.2 supports custom Pyspark Data Sources
- A custom data source allows you to connect to a source system that that Spark may not currently have support for

## PySpark Custom Data Sources - an Overview

Starting with [Apache Spark 4.0](https://spark.apache.org/docs/latest/api/python/tutorial/sql/python_data_source.html) and [Databricks 15.2](https://docs.databricks.com/aws/en/pyspark/datasources), PySpark supports custom data sources.

So what *are* PySpark Custom Data Sources?

Custom data sources allow you to define a source `format` other than the default built-in formats such as csv, json, and parquet. There are many other supported formats such as Delta and Iceberg, but if there is no community or commercial support offered for the data source of interest, you can extend and inherit some builtin PySpark classes and roll your own. One common example of this may be calling a REST endpoint.

[DuckDB](https://duckdb.org/) and [DuckLake](https://ducklake.select/) are being discussed a lot lately so I thought it would be fun to see how easy it would be to interact with it from Spark. DuckDB does have an [experimental Spark API](https://duckdb.org/docs/stable/clients/python/spark_api) but that would just be too easy, so let's try to roll our own for educational purposes.

### How does it work?

To use Custom Data Source, we define a class that inherits from `DataSource` and then a Reader or Writer class inherits from `DataSourceReader` or `DataSourceWriter` respectively. These classes all reside in the `pyspark.sql.datasource` module.

```shell
pyspark.sql.datasource
├── DataSource
├── DataSourceReader
└── DataSourceWriter
```

There is also a `DataSourceStreamReader` and `DataSourceStreamWriter` but we wont touch on them in this blog.

## Setup

Setup instructions follow but can also be setup using targets in a sample `Makefile` shown below in [References/Makefile](#makefile)
- [Install the DuckDB CLI](https://duckdb.org/docs/installation)
    - *Note* - This is a platform-dependent step so I'll omit this setup instruction here and refer you to the docs instead.

- Setup the Python environment. Also can be run with `make python-setup`
```shell
uv venv --python 3.12
source .venv/bin/activate
uv pip install duckdb ipython pyspark==4.0.0
```
- Create a quick test table in DuckDb. Can also be run with `make duckdb-setup`

```shell
duckdb dev.duckdb
create table t1 (c1 int);
insert into t1 values (1);
```

- Start PySpark use the make target: `make start-pyspark`

```shell
source .venv/bin/activate && \
      PYSPARK_DRIVER_PYTHON_OPTS="--TerminalInteractiveShell.editing_mode=vi --colors=Linux" PYSPARK_DRIVER_PYTHON=ipython pyspark
```

### Define a Data Source

Your custom data source must inherit from `DataSource` and will then be referenced by the custom reader class that will ultimately inherit from `DataSourceReader`.

```python
from pyspark.sql.datasource import DataSource, DataSourceReader
from pyspark.sql.types import StructType

class DuckDBDataSource(DataSource):
    @classmethod
    def name(cls):
        return "duckdb"

    def schema(self):
        ...

    def reader(self, schema: str):
        return DuckDBDataSourceReader(schema, self.options)
```

### Define a Data Source Reader

- This is where much of the magic resides in terms of how the Reader will interact with the DataSource.

```python
class DuckDBDataSourceReader(DataSourceReader):
    def __init__(self, schema, options):
        self.schema = schema
        self.options = options

    def read(self, partition):
        import duckdb
        db_path = self.options["db_path"]
        query = self.options["query"]
        with duckdb.connect(db_path) as conn:
            cursor = conn.execute(query)
            for row in cursor.fetchall():
                yield tuple(row)
```

## Read from a DuckDB source

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder.getOrCreate()
spark.dataSource.register(DuckDBDataSource)

(
    spark.read
    .format("duckdb")
    .option("db_path", "dev.duckdb")
    .option("query", "SELECT * FROM t1")
    .schema("c1 int")
    .load()
).show()
+---+
| c1|
+---+
|  1|
+---+
```

## Takeaway

This blog just scratches the surface of what's possible with Pyspark Custom Data Sources and would need numerous enhancements (obviously) to be used in any serious manner but hopefully gets across the point of the Data Source's capabilities.

## References

### Makefile

- A `Makefile` to help simplify the setup

```Makefile
# Makefile
.DEFAULT_GOAL := help
SHELL := /bin/bash

help: ## Show this help message
	@echo -e 'Usage: make [target] ...\n'
	@echo 'targets:'
	@egrep '^(.+)\:\ ##\ (.+)' ${MAKEFILE_LIST} | column -t -c 2 -s ':#'

.PHONY: setup-python
setup-python: ## setup python env and dependencies
	uv venv --python 3.12 .venv
	source .venv/bin/activate && uv pip install duckdb ipython pyarrow pyspark==4.0.0

.PHONY: setup-duckdb
setup-duckdb: ## setup duckdb database and test table with data
	duckdb dev.duckdb -c "create table t1 (c1 int); insert into t1 values (1);"

.PHONY: setup
setup: ## setup python and duckdb
	setup-python setup-duckdb


.PHONY: start-pyspark
start-pyspark: ## start-pyspark
	source .venv/bin/activate && \
      PYSPARK_DRIVER_PYTHON_OPTS="--TerminalInteractiveShell.editing_mode=vi --colors=Linux" PYSPARK_DRIVER_PYTHON=ipython pyspark
```