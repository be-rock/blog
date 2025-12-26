---
title: "Useful Stuff"
date: 2025-11-15T22:36:28
draft: false
summary: "Miscellaneous useful stuff that I pickup over time"
tags:
  - useful
---

This page intends to be a catch-all of useful stuff that I gather over time.

## 2025

### 2025-11

1. Provide a custom message for each commit to a Delta table

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
`#deltalake`

2. Attach a sqlite database to the duckdb CLI. It's a quick way to do analysis on a sqlite database using the duckdb engine for snappier query executions

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
`#duckdb` `#sqlite`

3. Google released Code Wiki which is described as:

> A new perspective on development for the agentic era. Gemini-generated documentation, always up-to-date.
> Ref: https://codewiki.google/

Here are a few interesting repos to assess:

- https://codewiki.google/github.com/apache/spark
- https://codewiki.google/github.com/duckdb/duckdb
- https://codewiki.google/github.com/jlowin/fastmcp
- https://codewiki.google/github.com/mlflow/mlflow
- https://codewiki.google/github.com/run-llama/llama_index
- https://codewiki.google/github.com/neondatabase/neon

`#ai` `#codewiki`

4. A nice aggregate summary of best practices when working with Claude Code https://rosmur.github.io/claudecode-best-practices/

`#ai` `#claudecode`

5. A summary of what's described as the "dev docs" approach to managing Claude Code context. Persisting the data to a set of files in a feature-specific directory allows for the context to be preserved even after context resets.

```text
project/dev/active/[task-name]/
├── [task-name]-plan.md      # Strategic plan
├── [task-name]-context.md   # Key decisions & files
└── [task-name]-tasks.md     # Checklist format
```
> Ref: https://github.com/diet103/claude-code-infrastructure-showcase/tree/main/dev#the-solution-persistent-dev-docs

Details on when to use each of these as well as some examples are in the doc above

`#ai` `#claudecode`

### 2025-12

1. `mitmproxy` is an interactive CLI tool that functions as a network proxy to simplify the inspection and debugging of web apps. The tool can be installed with `brew install mitmproxy` and then invoked like:

- `mitmproxy --mode reverse:https://your-web-app.com`
    - If you then opened http://localhost:8080 or interacted with the localhost URL programatically, the HTTP calls could be followed and monitored in your terminal

`#network`