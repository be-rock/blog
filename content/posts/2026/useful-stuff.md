---
title: "Useful Stuff (2026)"
date: 2026-01-04T15:51:19
draft: false
summary: "Miscellaneous useful stuff that I pick up over time"
tags:
  - useful
---

This page intends to be a catch-all of useful stuff that I gather over time.

## 2026

---

### 2026-05

Create an in-memory copy of a Sqlite file.

```python
import sqlite3

# Open the file-based DB
source = sqlite3.connect("mydb.sqlite")

# Create an in-memory DB and copy into it
dest = sqlite3.connect(":memory:")
source.backup(dest)
source.close()

# Now use `dest` — it's a full in-memory copy
```

`#sqlite`

### 2026-07

Quickly start a Python REPL in `ipython` with vim keybinds

```shell
uv venv && source .venv/bin/activate && uv pip install ipython && \
  ipython --TerminalInteractiveShell.editing_mode=vi --colors="Linux"
```

`#python`

Start Postgres in a container using `container` CLI:

```shell
 container run --name postgres \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password \
  -e PGDATA=/var/lib/postgresql/data/pgdata \
  -p 5432:5432 \
  -v postgres-volume:/var/lib/postgresql/data \
  -d postgres:17.10
```

Start the `psql` shell:
```shell
container exec -it postgres psql -U postgres
```

Start the pgcli shell which has some nice auto-complete features, supports vim mode, as well as all of the `\` commands built into `psql` :
```shell
PGPASSWORD='password' pgcli -h 127.0.0.1 -U postgres
```

`#postgres`