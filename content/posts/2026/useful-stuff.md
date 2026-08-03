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
PGPASSWORD='password' pgcli -h 127.0.0.1 -U postgres --prompt "postgres> "
```

`#postgres`

Nice little `Makefile` helper for sharing a common logging format among numerous targets

```Makefile
# Define color variables
GREEN  := \033[32m
CYAN   := \033[36m
YELLOW := \033[33m
RESET  := \033[0m

# log <level> <message>
log = printf '$(GREEN)%s$(RESET) | $(YELLOW)%s$(RESET) | $(CYAN)%s$(RESET)\n' \
    "$$(date +%Y-%m-%dT%H:%M:%S%z)" "$(strip $(1))" "$(strip $(2))"

.PHONY: test
test: ## test the logger
    @$(call log, INFO, hello world logger)
```

`#Makefile`

### 2026-08

Use `pgcli` to connect to Lakebase Postgres using a `Makefile` target run via: `make lakebase/pgcli`

```shell
.PHONY: lakebase/pgcli
lakebase/pgcli: ## start the lakebase pgcli shell 🐘
	PGPASSWORD=$$(databricks database generate-database-credential --request-id "$$(uuidgen)" --json '{"instance_names": ["yourinstanceHere"]}' | jq -r .token) \
		pgcli "postgresql://yourEmail%40gmail.com@name.database.us-east-2.cloud.databricks.com/databricks_postgres?sslmode=require"
```

Run a script in `pgcli`:

```
\i /path/to/script.sql
```

`#postgres`

