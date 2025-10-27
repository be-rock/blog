---
title: "Using the StreamingQueryListener with Spark Streaming"
date: 2025-10-13T20:08:27-05:00
draft: true
showToc: true
tags:
  - spark
  - streaming
  - streaming query listener
---

## Summary

This is an example of how to setup a Spark  [`StreamingQueryListener`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.ss/api/pyspark.sql.streaming.StreamingQueryListener.html) that writes to some sample targets such as `json` and `Postgres`.

## Setup

### Streaming Query

```python
from pyspark.sql import DataFrame
from pyspark.sql import functions as f
from pyspark.sql.streaming import DataStreamWriter, StreamingQuery

NUM = 1
SOURCE = "rate"
TARGET = "noop"
QUERY_NAME = f"{SOURCE}-{TARGET}-{NUM}"
CHECKPOINT_LOCATION = f"file:/tmp/checkpoint/{QUERY_NAME}"

readstream_options = {
    "rowsPerSecond": "1",
}

trigger_options = {
    "processingTime": "10 seconds",
}

writestream_options = {
    "checkpointLocation": CHECKPOINT_LOCATION,
}

readstream_df: DataFrame = (
    spark
    .readStream
    .format(SOURCE)
    .options(**readstream_options)
    .load()
)

datastream_writer: DataStreamWriter = (
    readstream_df
    .writeStream
    .trigger(**trigger_options)
    .format(TARGET)
    .options(**writestream_options)
    .queryName(QUERY_NAME)
)

streaming_query: StreamingQuery = datastream_writer.start()
```

### Streaming Query Listener - json to stdout

```python
import datetime
import json

from pyspark.sql.streaming.listener import (
    QueryIdleEvent,
    QueryProgressEvent,
    QueryStartedEvent,
    QueryTerminatedEvent,
    StreamingQueryListener,
)

class StreamingQueryListenerJson(StreamingQueryListener):

    def onQueryStarted(self, event: QueryStartedEvent) -> None:
        payload = {
            "time": datetime.datetime.now().isoformat(),
            "event": "onQueryStarted",
            "id": event.id,
            "name": event.name,
            "runId": event.runId,
            "message": "query started"
        }
        print(payload)


    def onQueryProgress(self, event: QueryProgressEvent) -> None:
        json_data = json.loads(event.progress.json)
        payload = {
            "time": datetime.datetime.now().isoformat(),
            "event": "onQueryProgress",
            "id": json_data.get("id"),
            "name": json_data.get("name"),
            "runId": json_data.get("runId"),
            "message": json.dumps(json_data)
        }
        print(payload)

    def onQueryIdle(self, event: QueryIdleEvent) -> None:
        payload = {
            "time": datetime.datetime.now().isoformat(),
            "event": "onQueryIdle",
            "id": event.id,
            "name": event.name,
            "runId": event.runId,
            "message": "query is idle"
        }
        print(payload)

    def onQueryTerminated(self, event: QueryTerminatedEvent) -> None:
        payload = {
            "time": datetime.datetime.now().isoformat(),
            "event": "onQueryIdle",
            "id": event.id,
            "name": event.name,
            "runId": event.runId,
            "message": "query is terminated"
        }
        print(payload)

spark.streams.addListener(StreamingQueryListenerJson())
```

### Streaming Query Listener - json to a file

```python
import datetime

from pyspark.sql.streaming.listener import (
    QueryIdleEvent,
    QueryProgressEvent,
    QueryStartedEvent,
    QueryTerminatedEvent,
    StreamingQueryListener,
)

class StreamingQueryListenerJson(StreamingQueryListener):
    def __init__(self) -> None:
        self.f = open("/tmp/f.json", "w")

    def onQueryStarted(self, event: QueryStartedEvent) -> None:
        payload = {
            "time": datetime.datetime.now().isoformat(),
            "event": "onQueryStarted",
            "id": event.id,
            "name": event.name,
            "runId": event.runId,
            "message": "query started"
        }
        self.f.write(json.dumps(payload))


    def onQueryProgress(self, event: QueryProgressEvent) -> None:
        json_data = json.loads(event.progress.json)
        payload = {
            "time": datetime.datetime.now().isoformat(),
            "event": "onQueryProgress",
            "id": json_data.get("id"),
            "name": json_data.get("name"),
            "runId": json_data.get("runId"),
            "message": json.dumps(json_data)
        }
        self.f.write(json.dumps(payload))

    def onQueryIdle(self, event: QueryIdleEvent) -> None:
        payload = {
            "time": datetime.datetime.now().isoformat(),
            "event": "onQueryIdle",
            "id": event.id,
            "name": event.name,
            "runId": event.runId,
            "message": "query is idle"
        }
        self.f.write(json.dumps(payload))

    def onQueryTerminated(self, event: QueryTerminatedEvent) -> None:
        payload = {
            "time": datetime.datetime.now().isoformat(),
            "event": "onQueryIdle",
            "id": event.id,
            "name": event.name,
            "runId": event.runId,
            "message": "query is terminated"
        }
        self.f.write(json.dumps(payload))
        self.f.close()

spark.streams.addListener(StreamingQueryListenerJson())
```

### Streaming Query Listener - Sqlite

Sqlite is not multi-threaded so we can experience failures with concurrent writes. One way to prevent this issue from happening, is to append the `StreamingQueryListener` events to append to a Python `queue.Queue()` instead of directly to the database, so that all writes can be managed by a single thread.

```python
from concurrent.futures import ThreadPoolExecutor
import datetime
import json
import queue
import sqlite3
import time

from pyspark.sql.streaming.listener import (
    QueryIdleEvent,
    QueryProgressEvent,
    QueryStartedEvent,
    QueryTerminatedEvent,
    StreamingQueryListener,
)

DB_PATH = "file:/tmp/f.db"


class StreamingQueryListenerSqlite(StreamingQueryListener):
    def __init__(self, db_path: str = DB_PATH) -> None:
        self.queue = queue.Queue()
        self.db_path = db_path
        self._executor = ThreadPoolExecutor(max_workers=1)
        self._database_setup()
        self._insert_statement = """
        INSERT INTO data
            (time, event, id, name, runId, message)
            values (?, ?, ?, ?, ?, ?)
        """
        self._executor.submit(self._queue_worker)

    def _create_connection(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path)

    def _create_cursor(self, connection: sqlite3.Connection) -> sqlite3.Cursor:
        return connection.cursor()

    def _database_setup(self) -> None:
        conn = self._create_connection()
        cur = self._create_cursor(connection=conn)
        cur.execute("""
        CREATE TABLE IF NOT EXISTS data (
            time TIMESTAMP NOT NULL,
            event TEXT NOT NULL,
            id TEXT NOT NULL,
            name TEXT NOT NULL,
            runId TEXT NOT NULL,
            message TEXT NOT NULL
        )
        """)
        conn.commit()
        conn.close()

    def onQueryStarted(self, event: QueryStartedEvent) -> None:
        payload = {
            "time": datetime.datetime.now().isoformat(),
            "event": "onQueryStarted",
            "id": event.id,
            "name": event.name,
            "runId": event.runId,
            "message": "query started",
        }
        self.queue.put(json.dumps(payload))

    def onQueryProgress(self, event: QueryProgressEvent) -> None:
        json_data = json.loads(event.progress.json)
        payload = {
            "time": datetime.datetime.now().isoformat(),
            "event": "onQueryProgress",
            "id": json_data.get("id"),
            "name": json_data.get("name"),
            "runId": json_data.get("runId"),
            "message": json.dumps(json_data),
        }
        self.queue.put(json.dumps(payload))

    def onQueryIdle(self, event: QueryIdleEvent) -> None:
        payload = {
            "time": datetime.datetime.now().isoformat(),
            "event": "onQueryIdle",
            "id": event.id,
            "name": event.name,
            "runId": event.runId,
            "message": "query is idle",
        }
        self.queue.put(json.dumps(payload))

    def onQueryTerminated(self, event: QueryTerminatedEvent) -> None:
        payload = {
            "time": datetime.datetime.now().isoformat(),
            "event": "onQueryIdle",
            "id": event.id,
            "name": event.name,
            "runId": event.runId,
            "message": "query is terminated",
        }
        self.queue.put(json.dumps(payload))
        self._conn.close()

    def _queue_worker(self) -> None:
        """Background worker that processes items from the queue and inserts them into the database.

        Runs continuously in a separate thread, polling the queue every second for new items.
        When an item is found, calls _insert_item_to_db to persist it.

        The worker will continue running until the thread is terminated or the program exits.
        If the queue is empty, it will wait for 1 second before checking again.
        """
        self._conn = self._create_connection()
        self._cursor = self._create_cursor(connection=self._conn)
        while True:
            try:
                item: str = self.queue.get(timeout=1)
                self._insert_item_to_db(
                    item=item, connection=self._conn, cursor=self._cursor
                )
            except queue.Empty:
                continue

    def _insert_item_to_db(
        self, item: str, connection: sqlite3.Connection, cursor: sqlite3.Cursor
    ) -> None:
        print(f"inserting item {item} to db ...")
        data = json.loads(item)
        cursor.execute(
            self._insert_statement,
            (
                data.get("time"),
                data.get("event"),
                data.get("id"),
                data.get("name"),
                data.get("runId"),
                data.get("message"),
            ),
        )
        connection.commit()

spark.streams.addListener(StreamingQueryListenerSqlite())
```

### Streaming Query Listener - other options

Other possible targets for the `StreamingQueryListener` events could include:

- an OLTP database like Postgres
- DuckDB (although similar concurrency issues as experienced with Sqlite may occur)
- [OpenTelemetry](https://opentelemetry.io/)
- AWS CloudWatch
- Datadog / Splunk / Prometheus
