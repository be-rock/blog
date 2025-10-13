---
title: "Apache Spark Streaming - templatized"
date: 2025-10-12T20:21:51-05:00
draft: false
showToc: true
tags:
  - spark
  - streaming
  - config
  - pydantic
---

## Summary

This is a template / code snippet that can be useful to quickly setup a Spark Streaming Query with a source and sink. The template will not work in all circumstances, such as a `foreachBatch` sink but is enough to get you started in a quick way, with some examples below on how this could be templatized even more using a markup language like `yaml`, if so desired.

## A Streaming Query template

```python
from pyspark.sql import DataFrame
from pyspark.sql import functions as f
from pyspark.sql.streaming import DataStreamWriter, StreamingQuery

NUM = 1
SOURCE = "rate" # delta, kafka, rate
TARGET = "noop" # delta, kafka, console, noop
QUERY_NAME = f"{SOURCE}-{TARGET}-{NUM}"
CHECKPOINT_LOCATION = f"file:/tmp/checkpoint/{QUERY_NAME}"

readstream_options = {
    "rowsPerSecond": "1", # rate
    # "skipChangeCommits": "true" # delta
    # "kafka.bootstrap.servers": "localhost:9092", # kafka
    # "subscribe": "topic1", # kafka
    # "startingOffsets": "latest", # kafka
}

trigger_options = {
    "processingTime": "1 seconds",
    # "availableNow": "true",
}

writestream_options = {
    "checkpointLocation": CHECKPOINT_LOCATION,
}


def apply_transformations(df: DataFrame) -> DataFrame:
    return df.withColumn("current_timestamp", f.current_timestamp())


readstream_df: DataFrame = (
    spark
    .readStream
    .format(SOURCE)
    .options(**readstream_options)
    .load()
)

transformed_df: DataFrame = apply_transformations(df=readstream_df)

datastream_writer: DataStreamWriter = (
    transformed_df
    .writeStream
    .trigger(**trigger_options)
    .format(TARGET)
    .options(**writestream_options)
    .queryName(QUERY_NAME)
)

streaming_query: StreamingQuery = datastream_writer.start()
```

### A summary of the above template

- Dictionaries to manage:
    - stream source options
    - stream sink options
    - trigger options
- A function to manage all transformations using [DataFrame.transform](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.transform.html) prior to writing to the sink, that can be expanded on
- A snippet for the [DataStreamWriter](https://spark.apache.org/docs/latest/api/python/reference/pyspark.ss/api/pyspark.sql.streaming.DataStreamWriter.html)
- And finally, a call to `.start()` to return a [StreamingQuery](https://spark.apache.org/docs/latest/api/python/reference/pyspark.ss/api/pyspark.sql.streaming.StreamingQuery.html)
    - Note that this would need to change to `toTable()` if writing to a table sink such as `delta` or `iceberg`.

### Further templatizing this code

You may wnat to codify this further into a markup language like `yaml` and then make the configuration strongly-typed using `pydantic`. Here's an example of what that might look like:

```python
from pydantic_settings import BaseSettings, YamlConfigSettingsSource

class AppConfig(BaseSettings):
    source: dict
    trigger: dict
    target: dict
    query_name: str

config: YamlConfigSettingsSource = YamlConfigSettingsSource(
    settings_cls=AppConfig,
    yaml_file="app-conf.yaml",
)
```
