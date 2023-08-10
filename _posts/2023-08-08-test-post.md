---
layout: post
title: Using Delta Lake with Apache Spark
---
- [Overview](#overview)
- [How it works](#how-it-works)
  - [Download a Spark Distribution](#download-a-spark-distribution)
  - [Create a Pyspark helper shell script](#create-a-pyspark-helper-shell-script)
  - [Start Pyspark (with jupyterlab)](#start-pyspark-with-jupyterlab)
- [Delta Lake Features](#delta-lake-features)
  - [Constraints](#constraints)
  - [Transactions](#transactions)
  - [Time Travel](#time-travel)

## Overview


> [According to the Delta Lake Introduction Docs](https://docs.delta.io/latest/delta-intro.html) Delta Lake is an open source project that enables building a Lakehouse architecture on top of data lakes. Delta Lake provides ACID transactions, scalable metadata handling, and unifies streaming and batch data processing on top of existing data lakes, such as S3, ADLS, GCS, and HDFS.

This blog will intend to break down a few of these core features, provide examples, and give a quick sense as to why open table formats such as Delta Lake have added benefits over purely columnar file formats like parquet in a data lake.

## How it works

The [Delta Lake Quick Start](https://docs.delta.io/latest/quick-start.html) provides some examples on how to set things up but for the following examples, let's try the following appoach:

1. Download a distribution of Apache Spark site
2. Create a little helper shell script to start Spark and download the required Delta libraries
3. Use Delta with Apache Spark

### Download a Spark Distribution

An Apache Spark tarball can be downloaded from https://spark.apache.org/downloads.html and extracted into a directory of your choosing. The directory that the tarball is extracted to becomes your `SPARK_HOME`. If the tarball was extracted in `/var/lib/` the `SPARK_HOME` should be set like so:

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

Set up a table for our tests:

```python
database = 'default'
table    = 't1'
db_table = f'{database}.{table}'

df = spark.range(1, 3)
df.write.format("delta").mode("overwrite").saveAsTable(db_table)
6
spark.read.table(db_table).show()
+---+
| id|
+---+
|  2|
|  1|
+---+
```

There are numerous ways to interact with Delta tables but two of the most common are through Spark or through an SDK like python. For example:

```python
from delta.tables import DeltaTable

deltaTable = DeltaTable.forName(sparkSession=spark, tableOrViewName=f"{database}.{table}")
```

What can you do with a delta_table you might be wondering? Inspecting the methods and attrbutes of the `delta_table` instance gives a good high-level indication:

```python
# show all supported DeltaTable methods
def show_attributes(obj) -> None:
    _ = [print(k, end=' ') for k in dir(obj) if not k.startswith("_")]

show_attributes(deltaTable)

alias
convertToDelta
create
createIfNotExists
createOrReplace
delete
detail
forName
forPath
generate
history
isDeltaTable
merge
optimize
replace
restoreToTimestamp
restoreToVersion
toDF
update
upgradeTableProtocol
vacuum
```

This list includes 21 items at time of writing, let's try to knock out each of these over the course of this post. We'll get a few of the more straight-forward items first:

- [x] detail
- [x] history
- [x] isDeltaTable

```python
# 1. `detail`` - return a dataframe showing details of the table
deltaTable.detail().show()
+------+------------------------------------+------------------------+-----------+-------------------------------------------------------------+-----------------------+-----------------------+----------------+--------+-----------+----------+----------------+----------------+------------------------+
|format|id                                  |name                    |description|location                                                     |createdAt              |lastModified           |partitionColumns|numFiles|sizeInBytes|properties|minReaderVersion|minWriterVersion|tableFeatures           |
+------+------------------------------------+------------------------+-----------+-------------------------------------------------------------+-----------------------+-----------------------+----------------+--------+-----------+----------+----------------+----------------+------------------------+
|delta |03c391f2-2418-4035-ac95-7a6fe6d9ba4 |spark_catalog.default.t3|null       |file:/home/myuser/code/git/notebooks/spark/spark-warehouse/t3|2023-08-08 13:12:26.361|2023-08-08 13:12:33.237|[]              |3       |1434       |{}        |1               |2               |[appendOnly, invariants]|
+------+------------------------------------+------------------------+-----------+-------------------------------------------------------------+-----------------------+-----------------------+----------------+--------+-----------+----------+----------------+----------------+------------------------+

# 2. `isDeltaTable` - returns a true/false bool
deltaTable.isDeltaTable(sparkSession=spark,
                        identifier=deltaTable.detail().select("location").collect()[0]['location'])
True

# 3. `history` - show a dataframe showing point-in-time history of a table
deltaTable.history().show(truncate=False)
+-------+-----------------------+------+--------+---------------------------------+-----------------------------------------------------------------------------+----+--------+---------+-----------+--------------+-------------+-----------------------------------------------------------+------------+-----------------------------------+
|version|timestamp              |userId|userName|operation                        |operationParameters                                                          |job |notebook|clusterId|readVersion|isolationLevel|isBlindAppend|operationMetrics                                           |userMetadata|engineInfo                         |
+-------+-----------------------+------+--------+---------------------------------+-----------------------------------------------------------------------------+----+--------+---------+-----------+--------------+-------------+-----------------------------------------------------------+------------+-----------------------------------+
|1      |2023-08-08 13:12:33.237|null  |null    |WRITE                            |{mode -> Append, partitionBy -> []}                                          |null|null    |null     |0          |Serializable  |true         |{numFiles -> 1, numOutputRows -> 1, numOutputBytes -> 478} |null        |Apache-Spark/3.4.1 Delta-Lake/2.4.0|
|0      |2023-08-08 13:12:26.621|null  |null    |CREATE OR REPLACE TABLE AS SELECT|{isManaged -> true, description -> null, partitionBy -> [], properties -> {}}|null|null    |null     |null       |Serializable  |false        |{numFiles -> 3, numOutputRows -> 2, numOutputBytes -> 1252}|null        |Apache-Spark/3.4.1 Delta-Lake/2.4.0|
+-------+-----------------------+------+--------+---------------------------------+-----------------------------------------------------------------------------+----+--------+---------+-----------+--------------+-------------+-----------------------------------------------------------+------------+-----------------------------------+
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

- *TODO* CCPA / GDPR / State Privacy regulations

