---
title: "Change Data Capture via Spark Streaming and Delta Lake CDF"
date: 2025-10-27T10:55:10-05:00
draft: false
showToc: true
tags:
  - cdc (change data capture)
  - databricks
  - delta lake
  - spark
  - streaming
---

## Summary

[Delta Lake](https://delta.io/) provides support for CDC (Change Data Capture) through its internal [Change Data Feed](https://docs.delta.io/delta-change-data-feed/) (CDF).

The docs describe this feature as:

> Change Data Feed (CDF) feature allows Delta tables to track row-level changes between versions of a Delta table. When enabled on a Delta table, the runtime records “change events” for all the data written into the table. This includes the row data along with metadata indicating whether the specified row was inserted, deleted, or updated.

Delta Lake provides both a batch and streaming interface to the CDF. Below we review the usage of Streaming CDF with a [foreachBatch](https://spark.apache.org/docs/latest/api/python/reference/pyspark.ss/api/pyspark.sql.streaming.DataStreamWriter.foreachBatch.html) stream sink where the provided function takes the given CDF `insert`, `update`, `delete` record and performs a `merge` into the target table.

[The Delta Lake Protocol](https://github.com/delta-io/delta/blob/master/PROTOCOL.md#change-data-files) describes the CDF like this with respect to how readers are writers should handle change data files:

> Change data files are stored in a directory at the root of the table named `_change_data`, and represent the changes for the table version they are in. For data with partition values, it is recommended that the change data files are stored within the `_change_data` directory in their respective partitions (i.e. `_change_data/part1=value1/...`). Writers can optionally produce these change data files as a consequence of operations that change underlying data, like `UPDATE`, `DELETE`, and `MERGE` operations to a Delta Lake table. If an operation only adds new data or removes existing data without updating any existing rows, a writer can write only data files and commit them in add or remove actions without duplicating the data into change data files.

## A Streaming CDF Example - Setup

### Create Source and Target Delta tables

```python
BASE_SCHEMA = """
c1 long,
c2 string"""
CDF_SCHEMA = """
_record_commit_version long,
_record_commit_timestamp timestamp,
_record_change_type string"""

# the CDF is only needed on the source table from which we stream from
spark.sql(f"""
CREATE OR REPLACE TABLE src_table (
    {BASE_SCHEMA}
)
USING DELTA
TBLPROPERTIES (
    delta.enableChangeDataFeed = true
)
""")

spark.sql(f"""
CREATE OR REPLACE TABLE tgt_table (
    {BASE_SCHEMA},
    {CDF_SCHEMA}
)
USING DELTA
""")
```

### Setup the stream

```python
from pyspark.sql import functions as f
from pyspark.sql import SparkSession
from pyspark.sql.dataframe import DataFrame
from pyspark.sql.streaming.readwriter import DataStreamReader, DataStreamWriter
from pyspark.sql.streaming.query import StreamingQuery

NUM = 1
VOLUME_PATH = "<your S3 or UC volume location>"
CHECKPOINT_LOCATION = f"{VOLUME_PATH}/checkpoint/{NUM}"
QUERY_NAME = f"my-query-{NUM}"

readstream_options = {
    "readChangeFeed": "true",
}

writestream_options = {
    "checkpointLocation": CHECKPOINT_LOCATION,
    "mergeSchema": "true",
}

trigger_options = {
    "availableNow": True
}

readstream_df: DataFrame = (
    spark.readStream
    .format("delta")
    .options(**readstream_options)
    .table("src_table")
    .filter(f.col("_change_type").isin(["update_postimage", "insert", "delete"]))
    .withColumn("_record_change_type", f.expr("upper(substr(_change_type, 1, 1))"))
    .withColumnRenamed("_commit_version", "_record_commit_version")
    .withColumnRenamed("_commit_timestamp", "_record_commit_timestamp")
)


def process_batch(df, batch_id):
    """process data in each microbatch"""
    df.createOrReplaceTempView("updates")

    df.sparkSession.sql("""
    MERGE INTO tgt_table AS target
    USING updates AS source
    ON source.id = target.id
    WHEN MATCHED AND source._record_change_type = 'U'
      THEN UPDATE SET *
    WHEN MATCHED AND source._record_change_type = 'D'
      THEN DELETE
    WHEN NOT MATCHED THEN INSERT *
    """
    )


datastream_writer: DataStreamWriter = (
    readstream_df
    .writeStream
    .queryName(QUERY_NAME)
    .foreachBatch(process_batch)
    .option("checkpointLocation", CHECKPOINT_LOCATION)
    .trigger(**trigger_options)
)
```

### Load test data and start the stream

Insert 5 rows:

```sql
insert into src_table
  select
    id,
    'test'
  from
    range(5)
```

...and start the streaming query:

```python
streaming_query: StreamingQuery = datastream_writer.start()
```

Reviewing the results shows, as expected, 5 records inserted into the target.

![Query results](../spark-streaming-delta-lake-cdf/query_results1.png)

### Updates and Deletes

Update one row:

```sql
update
  tgt_table
set
  c2 = 'test2'
where
  `id` > 3
```

...and start the streaming query again:

```python
streaming_query: StreamingQuery = datastream_writer.start()
```

...and the query results show the updated value of `test2`:

![Query results](../spark-streaming-delta-lake-cdf/query_results2.png)

Deleting one row from the source table:

```sql
delete from
  src_table
where
  c2 = 'test2'
```

...and start the streaming query again:

```python
streaming_query: StreamingQuery = datastream_writer.start()
```

...and we can see that the row with `id = 4` is now deleted.

![Query results](../spark-streaming-delta-lake-cdf/query_results3.png)

This behavior is pretty intuitive based on the `merge` logic on our `foreachBatch` function.

## What about SCD Type 2 Dimensions?

Now, a next reasonable thought is to take this approach and use it to maintain an SCD Type 2 table in a star schema. This is possible, and can be done, but it can get a bit messy and there are edge cases such as with late-arriving data.

If using Databricks, it would likely be worth taking a closer look at [Auto CDC API](https://docs.databricks.com/aws/en/ldp/cdc) with Declarative Pipelines which can help simplify things  by addressing the edge-cases described above without needing to add complexity to your code.

## How does Delta CDF work?

Reads happen via the [`CDCReader`](https://github.com/delta-io/delta/blob/b388f280d083d4cf92c6434e4f7a549fc26cd1fa/spark/src/main/scala/org/apache/spark/sql/delta/commands/cdc/CDCReader.scala) which looks for the change data in a [`CDC_LOCATION` path](https://github.com/delta-io/delta/blob/b388f280d083d4cf92c6434e4f7a549fc26cd1fa/spark/src/main/scala/org/apache/spark/sql/delta/commands/cdc/CDCReader.scala#L99) which defaults to `_change_data` as also described in the Protocol docs referenced above.

When a user invokes a CDF read such as with the `table_changes()` table-valued SQL function, or with Spark's `readChangeFeed` option, the logic scans the transaction logs in `_delta_log` for the specified versions, interprets the `add` and `remove` actions and reconstructs the rows that were inserted, updated, deleted as of the specified transaction number

Writes happen based on the type of delta Command submitted. The CDF can produce 4 change events including `update_preimage`, `update_postimage`, `insert`, `delete` so there are 3 basic 'types' of CDF events: insert, update, delete which correspond to:

- [`WriteIntoDelta`](https://github.com/delta-io/delta/blob/b388f280d083d4cf92c6434e4f7a549fc26cd1fa/spark/src/main/scala/org/apache/spark/sql/delta/commands/WriteIntoDelta.scala#L80)
- [`UpdateCommand`](https://github.com/delta-io/delta/blob/b388f280d083d4cf92c6434e4f7a549fc26cd1fa/spark/src/main/scala/org/apache/spark/sql/delta/commands/UpdateCommand.scala#L58)
- [`DeleteCommand`](https://github.com/delta-io/delta/blob/b388f280d083d4cf92c6434e4f7a549fc26cd1fa/spark/src/main/scala/org/apache/spark/sql/delta/commands/DeleteCommand.scala#L110)

## Summary

Delta Lake's CDF is powerful and can be great when wanting to just propogate changes from an upstream Delta source to a dependent table(s). For advanced use cases such as SCD type 2 maintenance, Auto CDC can save some headaches.

One potential gotcha that users of the CDF data need to be aware of is that the `_change_data` is maintained in the same way as the table data. This means that `vacuum` operations will remove the CDF data at the same time as the table data.
