---
title: "Useful Stuff"
date: 2025-11-09T20:30:07-06:00
draft: true
showToc: true
tags:
  - miscellaneous
---

This page intends to be a catch-all of useful stuff that I gather over time.

## 2025

1. Provide a custom message for each commit to a Delta table (`#delta lake`)
```python
import datetime
import json

# custom metadata
json_data: str = json.dumps({
    "name": "my-app",
    "event_timestamp": datetime.datetime.utcnow().isoformat()
})

# delta write
(
    spark.range(1)
    write.format("delta")
    .option("userMetadata", json_data)
    .mode("append")
    .saveAsTable("t1")
)

# read the userMetadata from the delta history
with hist as (
    desc history t1
)
select
  userMetadata
from
  hist
# {"name": "my-app", "event_timestamp": "2025-11-09..."}
```

2. Attach a sqlite database to the duckdb CLI. It's a quick way to do analysis on a sqlite database using the duckdb engine for snappier query executions (`#duckdb` `#sqlite`)
```shell
duckdb
D INSTALL sqlite;
D LOAD sqlite;
D ATTACH 'mydb.db' AS db (TYPE sqlite);
D.databases
D USE db;
D.tables
D select * from mytable;
```
