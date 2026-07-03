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
uv venv && source .venv/bin/activate && uv pip install ipython && ipython --TerminalInteractiveShell.editing_mode=vi --colors="Linux"
```

`#python`
