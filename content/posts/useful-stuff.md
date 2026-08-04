---
title: "Useful Stuff"
date: 2026-01-04T15:51:19
draft: false
summary: "Miscellaneous useful stuff that I pick up over time"
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

`#ai` `#claudecode` `#spec-driven-development`

### 2025-12

1. `mitmproxy` is an interactive CLI tool that functions as a network proxy to simplify the inspection and debugging of web apps. The tool can be installed with `brew install mitmproxy` and then invoked like:

- `mitmproxy --mode reverse:https://your-web-app.com`
    - If you then opened http://localhost:8080 or interacted with the localhost URL programatically, the HTTP calls could be followed and monitored in your terminal

`#network`

2. Use GitHub's [spec-kit](https://github.com/github/spec-kit.git) to use spec-driven development for starting and managing an AI-driven project. This is similar in concept to the 'dev-docs' approach referenced above.

- install the `specify` CLI
    - `uv tool install specify-cli --force --from git+https://github.com/github/spec-kit.git`
- initialize a new project
    - `specify init <PROJECT_NAME> --ai claude`

Sequentially, the approach to take for project features is:

```text
/speckit.constitution
     /speckit.specify
        /speckit.clarify (optional but recommended)
            /speckit.plan
                /speckit.tasks
                     /speckit.implement
```

The `constitution` is described as: "Create or update project governing principles and development guidelines" so would be done once at the project level and then the introduction of new features (say new-feature-1 and new-feature-2) would result in the `specify` through `implement` workflow to be repeated twice, one for each different feature.

`specify` will create a new feature branch and directory for each corresponding new feature. So the introduction of `new-feature-1` would look like:

```text
.
├── hello-world
├── index.html
├── README.md
└── specs
    └── 001-new-feature-1
        ├── checklists
        │   └── requirements.md
        ├── contracts
        │   └── README.md
        ├── data-model.md
        ├── plan.md
        ├── quickstart.md
        ├── research.md
        ├── spec.md
        └── tasks.md
```

Context can be `/clear`'d after each feature is implemented and should not be performed during the `specify` feature session. `new-feature-2` would then reside under `002-new-feature-2` after running `/speckit.specify`

```text
.
├── hello-world
├── index.html
├── README.md
└── specs
    ├── 001-hello-world-page
    │   ├── ...
    └── 002-visitor-counter
        ├── ...
```

`#ai` `#claudecode` `#spec-driven-development`

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
