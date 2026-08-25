---
title: "Spark Streaming - Templatized (Take 2)"
date: 2026-08-24T22:37:08-05:00
draft: true
tags:
  - spark
  - streaming
---

This is take #2 on a mechanism for templatizing Spark Streaming for quick testing and reproducing issues using Python dataclasses. This is a follow-up to the original post [here](../../2025/spark-streaming-templatized/). This is less of a content-filled post and more of a reference guide post.

---

## Setup

```python
# Setup
from dataclasses import dataclass, asdict, field


@dataclass
class Source:
    format: str = "delta"
    mode: str = "append"
    table: str = "my_catalog.default.stream_source"


@dataclass
class ReadstreamOptions:
    ...
    # startingVersion: str = "latest"


@dataclass
class Trigger:
    processingTime: str = "1 seconds"


@dataclass
class Sink:
    checkpointLocation: str = "dbfs:/Volumes/my_catalog/default/checkpoints/"
    format: str = "delta"
    mode: str = "append"
    table: str = "my_catalog.default.stream_sink"


@dataclass
class SchemaRegistry:
    url: str = "https://mycsr.us-east-2.aws.confluent.cloud"
    subject: str = "subject_1"

    def __post_init__(self):
        self._key = f"{key}:{secret}" # not shown here


@dataclass(frozen=True)
class StreamConfig:
    source: Source = field(default_factory=Source)
    trigger: Trigger = field(default_factory=Trigger)
    sink: Sink = field(default_factory=Sink)
    schema_registry: SchemaRegistry = field(default_factory=SchemaRegistry)

STREAM_CONFIG = StreamConfig()


schema_registry_options = {
    "confluent.schema.registry.basic.auth.credentials.source": "USER_INFO",
    "confluent.schema.registry.basic.auth.user.info": STREAM_CONFIG.schema_registry._key,
    "mode": "PERMISSIVE",
    "avroSchemaEvolutionMode": "restart",
}
```

## Write a test record with Avro-serialized data

```python
import datetime

from pyspark.sql import functions as f
from pyspark.sql.avro.functions import to_avro

records = [
    {
        "topic": STREAM_CONFIG.schema_registry.subject,
        "partition": 0,
        "offset": 0,
        "timestamp": datetime.datetime.now().isoformat(),
        "my_field1": 1,
        "my_field2": "val1",
    }
]

# note `schema_data` here is a json string returned by query the latest version of the
# avro schema from the CSR (Confluent Schema Registry). It could also just be a locally-defined schema string
(
    spark.createDataFrame(records)
    .select(
        f.encode(f.col("topic"), "UTF-8").alias("key"),
        to_avro(
            data=f.struct(
                f.col("my_field1").cast("int").alias("my_field1"),
                f.col("my_field2").alias("my_field2"),
            ),
            subject=f.lit(STREAM_CONFIG.schema_registry.subject),
            schemaRegistryAddress=STREAM_CONFIG.schema_registry.url,
            jsonFormatSchema=schema_data["schema"],
            options=schema_registry_options,
        ).alias("value"),
        "topic",
        "partition",
        "offset",
        f.to_timestamp("timestamp").alias("timestamp"),
    )
    .write.format(STREAM_CONFIG.source.format)
    .mode(STREAM_CONFIG.source.mode)
    .saveAsTable(STREAM_CONFIG.source.table)
)
```

## Setup the stream

```python
import datetime
import json

from pyspark.sql import functions as f
from pyspark.sql import SparkSession
from pyspark.sql.dataframe import DataFrame
from pyspark.sql.streaming.readwriter import DataStreamWriter
from pyspark.sql.streaming.query import StreamingQuery
from pyspark.sql.avro.functions import from_avro

# dbutils.fs.rm(STREAM_CONFIG.sink.checkpointLocation, True)

readstream_df: DataFrame = (
    spark.readStream.format(STREAM_CONFIG.source.format)
    .options(**asdict(ReadstreamOptions()))
    .table(STREAM_CONFIG.source.table)
    .withColumn(
        "parsed",
        from_avro(
            f.col("value"),
            subject=STREAM_CONFIG.schema_registry.subject,
            schemaRegistryAddress=STREAM_CONFIG.schema_registry.url,
            options=schema_registry_options,
        ),
    )
)

datastream_writer: DataStreamWriter = (
    readstream_df.writeStream.trigger(**asdict(STREAM_CONFIG.trigger))
    .outputMode(STREAM_CONFIG.sink.mode)
    .options(**asdict(STREAM_CONFIG.sink))
    .queryName("my_query_name")
    .format(STREAM_CONFIG.sink.format)
)
```

## Start the stream

```python
streaming_query: StreamingQuery = datastream_writer.toTable(STREAM_CONFIG.sink.table)
```

---