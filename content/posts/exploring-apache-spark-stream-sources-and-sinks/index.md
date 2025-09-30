---
title: "Exploring Apache Spark Stream Sources"
date: 2025-09-19T20:21:51-05:00
draft: true
showToc: true
tags:
  - delta lake
  - kafka
  - spark
  - streaming
---

## Summary

The purpose of this blog is to

## A basic streaming Pattern

To summarize the above, we have
- a Dataclass to manage config
- a function to manage the source stream read
- a function to manage transformations with [DataFrame.transform](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.transform.html)
- a function to create the [DataStreamWriter](https://spark.apache.org/docs/latest/api/python/reference/pyspark.ss/api/pyspark.sql.streaming.DataStreamWriter.html)
- and finally a function to pull it all together and return a [StreamingQuery](https://spark.apache.org/docs/latest/api/python/reference/pyspark.ss/api/pyspark.sql.streaming.StreamingQuery.html)

So to create a simple test with a source format of `rate` and `noop` sink, we could:

```python
stream_options: StreamOptions = StreamOptions(
    source_format="rate",
    source_options={"rowsPerSecond": 1},
    target_format="noop",
    target_options={"checkpointLocation": "file:/tmp/checkpoint"},
    query_name=f"source_rate_sink_noop"
)

streaming_query: StreamingQuery = create_streaming_query(stream_options=stream_options)
```

With that basic setup and framework for working with various sources and sinks, let's look closer at the `rate` stream introduced above.

## Stream Sources

### Rate Stream Source

Our `rate` stream was setup above with `{"rowsPerSecond": 1}`.
```python
>>> streaming_query.status
{'message': 'Waiting for data to arrive', 'isDataAvailable': False, 'isTriggerActive': False}
>>> streaming_query.status
{'message': 'Getting offsets from RateStreamV2[rowsPerSecond=1, rampUpTimeSeconds=0, numPartitions=default', 'isDataAvailable': False, 'isTriggerActive': True}
>>> streaming_query.lastProgress
{
  "id" : "4bb12c34-9550-4b55-93e6-cc67542c44a8",
  "runId" : "d0693a74-72d5-47c1-9da0-6f44853145d3",
  "name" : "source_rate_sink_noop",
  "timestamp" : "2025-09-20T02:52:16.433Z",
  "batchId" : 101,
  "batchDuration" : 50,
  "numInputRows" : 1,
  "inputRowsPerSecond" : 76.92307692307692,
  "processedRowsPerSecond" : 20.0,
  "durationMs" : {
    "addBatch" : 11,
    "commitOffsets" : 9,
    "getBatch" : 0,
    "latestOffset" : 0,
    "queryPlanning" : 4,
    "triggerExecution" : 50,
    "walCommit" : 25
  },
  "stateOperators" : [ ],
  "sources" : [ {
    "description" : "RateStreamV2[rowsPerSecond=1, rampUpTimeSeconds=0, numPartitions=default",
    "startOffset" : 100,
    "endOffset" : 101,
    "latestOffset" : 101,
    "numInputRows" : 1,
    "inputRowsPerSecond" : 76.92307692307692,
    "processedRowsPerSecond" : 20.0
  } ],
  "sink" : {
    "description" : "org.apache.spark.sql.execution.datasources.noop.NoopTable$@58ff87a3",
    "numOutputRows" : 1
  }
}
```

This `lastProgress` comes from the class `pyspark.sql.streaming.listener.StreamingQueryProgress` and is referred to as the Progress Reporter and can be used to set up custom monitoring and observability solutions. More on this later TODO. The `noop` sink here in our example is an empty write, similar to writing to `/dev/null` on Unix-based systems.

## Stream Sources

## References



### Makefile