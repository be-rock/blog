---
layout: post
title: Using Delta Lake with Apache Spark
categories:
    - spark
    - delta
---
- [Overview](#overview)
- [Getting Started](#getting-started)
  - [Download a Spark Distribution](#download-a-spark-distribution)
  - [Create a Pyspark helper shell script](#create-a-pyspark-helper-shell-script)
  - [Start Pyspark (with jupyterlab)](#start-pyspark-with-jupyterlab)
- [Delta Lake Features](#delta-lake-features)
  - [Delta Log](#delta-log)
  - [Data Management](#data-management)
  - [Constraints](#constraints)
  - [Transactions](#transactions)
  - [Time Travel](#time-travel)

## Overview


[According to the Delta Lake Introduction Docs](https://docs.delta.io/latest/delta-intro.html)
> Delta Lake is an open source project that enables building a Lakehouse architecture on top of data lakes. Delta Lake provides ACID transactions, scalable metadata handling, and unifies streaming and batch data processing on top of existing data lakes, such as S3, ADLS, GCS, and HDFS.

This blog will try to break down a few of these core features, provide examples, and give a quick sense as to why open table formats such as Delta Lake have added benefits over other data lake file formats such as parquet.

## Getting Started

The [Delta Lake Quick Start](https://docs.delta.io/latest/quick-start.html) provides some examples on how to set things up but for the examples in this post, the environment was setup as follows:

1. Download a Spark distribution from the Apache Spark site
2. Create a little helper shell script to start Spark and download the required Delta libraries
3. Use Delta with Apache Spark

### Download a Spark Distribution

An Apache Spark tarball can be downloaded from https://spark.apache.org/downloads.html and extracted into a directory of your choosing. The directory that the tarball is extracted to becomes your `SPARK_HOME`. If the tarball was extracted in `/var/lib/` then `SPARK_HOME` should be set like so:

```shell
export SPARK_HOME=/var/lib/spark-3.4.1-bin-hadoop3/
```

...where the target directory differs based on the version of Spark.

The Pyspark shell could then be started like:

```shell
$SPARK_HOME/bin/pyspark
```

### Create a Pyspark helper shell script

Let's install jupyter into a virtual environment and then download the Delta libraries of interest. Here's a snippet to create a shell script called `start_pyspark.sh` to do that:

```shell
# install jupyter into a virtual environment
python -m venv .venv
.venv/bin/pip install jupyterlab
```

```shell
# start_pyspark.sh
DELTA_VERSION=2.4.0
DEPENDENCIES=(
    io.delta:delta-core_2.12:$DELTA_VERSION
)
VENV_DIR=.venv

echo "activating python venv $VENV_DIR ..."
source $VENV_DIR/bin/activate
echo "the active venv is using python version $($(which python) --version) ..."

export PYSPARK_DRIVER_PYTHON=$(which jupyter-lab)
export PYSPARK_DRIVER_PYTHON_OPTS="--TerminalInteractiveShell.editing_mode=vi"
export PYSPARK_PYTHON=$(which python)
export SPARK_LOCAL_IP="localhost"
export SPARK_HOME="${SPARK_HOME:-$1}"

$SPARK_HOME/bin/pyspark \
    --packages $DEPENDENCIES \
    --conf "spark.sql.extensions=io.delta.sql.DeltaSparkSessionExtension" \
    --conf "spark.sql.catalog.spark_catalog=org.apache.spark.sql.delta.catalog.DeltaCatalog"
```

### Start Pyspark (with jupyterlab)

```shell
./start_pyspark.sh
```

## Delta Lake Features

Set up a simple table for our tests:

```python
database = 'mydb'
table    = 't1'
db_table = f'{database}.{table}'

spark.sql(f"create database if not exists {database}")

df = spark.range(1, 3)
df.show()
+---+
| id|
+---+
|  2|
|  1|
+---+

df.write.format("delta").mode("overwrite").saveAsTable(db_table)
```

```shell
# show the file structure hierarchy
!tree ./spark-warehouse/mydb.db/t1/
./spark-warehouse/mydb.db/t1/
├── _delta_log
│   └── 00000000000000000000.json
├── part-00000-6161790c-16a3-432c-b837-b61c28443ff9-c000.snappy.parquet
├── part-00007-4ec220ce-163f-4fe7-a6e2-2d6bfb21974a-c000.snappy.parquet
└── part-00015-7ab78345-c9ea-40d9-b137-d067646832cf-c000.snappy.parquet

1 directory, 4 files
```

### Delta Log

The Delta Log is the transactional component of a delta table and is represented in the above filesystem hierarchy snippet represented in directory `_delta_log`.

The delta log contains the table schema and schema change information, references to the files that comprise the table, and other various metadata and metrics.

A single json file is written per transaction. To continue with the example started above:

```shell
spark.sql(f"insert into {db_tablej} values (3)")
./spark-warehouse/mydb.db/t1/
├── _delta_log
│   ├── 00000000000000000000.json
│   └── 00000000000000000001.json
├── part-00000-27f9f793-77ef-4b20-9f2b-ef82c2b632cf-c000.snappy.parquet
├── part-00000-6161790c-16a3-432c-b837-b61c28443ff9-c000.snappy.parquet
├── part-00007-4ec220ce-163f-4fe7-a6e2-2d6bfb21974a-c000.snappy.parquet
└── part-00015-7ab78345-c9ea-40d9-b137-d067646832cf-c000.snappy.parquet
1 directory, 6 files
```

This single inserted record resulted in a new transaction log as well as a new data file. After, by default, every 10 transactions a checkpoint will be created in the delta log. This checkpoint file is in parquet format and serves to reduce the amount of json file reads that are required on tables with heavy transactions (and thus many json transaction logs).

```python
for i in range(0, 10):
    spark.sql(f"insert into {db_table} values ({i})")
```

```shell
!tree ./spark-warehouse/mydb.db/t1/
./spark-warehouse/mydb.db/t1/
├── _delta_log
│   ├── 00000000000000000000.json
...
│   ├── 00000000000000000010.checkpoint.parquet
│   ├── 00000000000000000010.json
...
1 directory, 28 files
```

Let's observe what happens when we delete a single record from the table.

```python
spark.sql(f"DELETE FROM {db_table} WHERE id = 7")
```

```shell
!tree ./spark-warehouse/mydb.db/t1/
./spark-warehouse/mydb.db/t1/
├── _delta_log
│   ├── 00000000000000000000.json
...
1 directory, 30 files
```

So the `DELETE` operation added 2 new files, one of which is the new transaction log json file, as expected but the other file is, strangely, a new parquet data file.

### Data Management

As shown in the above example, the amount of transaction and data files can grow quickly.

```python
spark.read.table(f"{db_table}").count()
12
```

The table has only 12 single-column records but has resulted in 30 files in the `_delta_log` and 16 parquet files.

```shell
!find ./spark-warehouse/mydb.db/t1/_delta_log/ -type f | wc -l
30

!find ./spark-warehouse/mydb.db/t1/ -name "*parquet" -type f | wc -l
16
```

One way to compact this is to use the `VACUUM` command.

```python
spark.sql(f"VACUUM {db_table}")
```

### Constraints

Delta supports check constraints like traditional database constraints and are enforced upon write. Constraints could include null constraints, value constraints, *TODO*.

The list of supported constraints can be found in the official docs here: []()

```python
# add the constraint
spark.sql(f"ALTER TABLE {db_table} ADD CONSTRAINT idMinimumValue CHECK (id > 0)")
spark.sql(f"insert into {db_table} values (-1)")
Py4JJavaError
...
org.apache.spark.sql.delta.schema.DeltaInvariantViolationException: CHECK constraint c1minimumvalue (c1 > 0) violated by row with values:
...
spark.sql(f"insert into {db_table} values (3)")
spark.read.table(db_table).show()
+---+
| id|
+---+
|  2|
|  3|
|  1|
+---+
```

### Transactions

Delta supports both updates and deletes. Tables with heavy transactions can have result in stale data that can be cleaned up using `optimize` *TODO* and `vaccuum`.

```python
# this will clean up deleted data that is not needed beyond the provide retentionHours retention threshold
deltaTable.vacuum(retentionHours=(24 * 14))
```

*TODO* - was not able to get this to work when testing locally with a minimal `retentionHours` value due to this safe-guard:

> If you are certain that there are no operations being performed on this table, such as
> insert/upsert/delete/optimize, then you may turn off this check by setting:
> spark.databricks.delta.retentionDurationCheck.enabled = false

### Time Travel

```python
spark.read.table(f"{database}.{table}").show()
+---+
| id|
+---+
|  3|
|  2|
|  1|
+---+

spark.read.option("versionAsOf", 0).table(f'{database}.{table}').show()
+---+
| id|
+---+
|  2|
|  1|
+---+

spark.read.option("versionAsOf", 1).table(f'{database}.{table}').show()
+---+
| id|
+---+
|  2|
|  1|
+---+
```