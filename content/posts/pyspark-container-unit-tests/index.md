---
title: "Using a Container to run PySpark Unit Tests"
date: 2025-07-12T12:58:15-05:00
draft: false
showToc: true
tags:
    - containers
    - spark
    - testing
---

## Summary

- Running PySpark unit tests in a Container can make for a repeatable, portable way to unit test your code
- This simple library can be used as a template to create a repeatable set of Pyspark tests for both reference and understanding

## Why, just why?

Hopefully you do not need to be convinced of the value of unit testing; there is really no shortage of content on this topic. If we can agree on that, what I have found in my day-to-day is that I am often in the Spark shell trying to evaluate functions, generate explain plans, and trying to confirm my understanding of internals.

Rather than running these tests on-demand, or add these examples in a notebook, I thought that it would be useful to build up a little library of these commands that can be run using `pytest` where performance can be evaluated and could also be used as a reference/cheatsheet.

Does this library serve any *real* practical purpose other than learning and understanding? No, not really. But maybe this can be a spring-board for something else

## Setup a basic project structure

I find it helpful to use a `Makefile` to produce a consistent and a well-documented and repeatable build process. The `Makefile` is in [References/Makefile](#makefile). The basic project structure when completed will be:

```shell
❯ tree
.
├── Containerfile
├── Makefile
├── pyproject.toml
└── tests
    └── test_pyspark.py

1 directory, 4 files
```

### The container image specification

Following is the `Containerfile` (a `Dockerfile` would also suffice). The specifications of the container image are:

```Dockerfile
# Containerfile
FROM ghcr.io/astral-sh/uv:debian

# Java is required for PySpark
RUN apt-get update && \
    apt-get install -y openjdk-17-jdk && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml /app/pyproject.toml

RUN uv sync

ENV PYSPARK_PYTHON=/usr/bin/python3

COPY tests/ /app/tests/

CMD ["uv", "run", ".venv/bin/pytest", "--durations=0", "-v", "/app/tests/"]
```

### The Python project setup

The Python aspect of the app will contain 2 major components, a `pyproject.toml` and a unit test to get started.

```toml
# pyproject.toml
[project]
name = "spark-test"
version = "0.1.0"
description = "Spark unit tests"
dependencies = [
    "pytest",
    "pyspark==3.5.2",
]
```

And the unit tests:

```python
# tests/tests_pyspark.py
import pytest
from pyspark.sql import SparkSession
from pyspark.sql import functions as sf
from pyspark.sql import types as st

@pytest.fixture(scope="session")
def spark():
    spark_session = (
        SparkSession.builder
        .master("local[*]")
        .appName("pytest-pyspark-testing")
        .getOrCreate()
    )
    yield spark_session
    spark_session.stop()

@pytest.fixture
def sample_df(spark):
    data = [("A", 10), ("A", 20), ("B", 5)]
    return spark.createDataFrame(data, ["group", "value"])

def test_spark_range_count(spark):
    assert spark.range(2).count() == 2

def test_group_and_sum(sample_df):
    result = (
        sample_df
        .groupBy("group")
        .agg(sf.sum("value").alias("total"))
        .where("group = 'A'")
        .first()
    )
    assert isinstance(result, st.Row)
    assert result.total == 30
```

Note that if iterating quickly and making many test changes, it may be beneficial to directly mount the `tests/` directory as a volume so the image does not need to be rebuilt.

### Build the container image

The associated `Makefile` assumes that you are using [podman](https://podman.io/) instead of Docker, but can easily be swapped out if so desired by simply changing the `CMD := podman` to `CMD := docker`. Then run:

`make build-image`

## Run the test suite

The tests can now be run with `make test`. The `pytest` command is invoked with verbose options that include runtime durations.

```shell
❯ make test
podman run --rm spark-test
warning: No `requires-python` value found in the workspace. Defaulting to `>=3.11`.
============================= test session starts ==============================
platform linux -- Python 3.11.2, pytest-8.4.1, pluggy-1.6.0 -- /app/.venv/bin/python
cachedir: .pytest_cache
rootdir: /app
configfile: pyproject.toml
collecting ... collected 2 items

tests/test_pyspark.py::test_spark_range_count PASSED                     [ 50%]
tests/test_pyspark.py::test_group_and_sum PASSED                         [100%]

============================== slowest durations ===============================
6.17s call     tests/test_pyspark.py::test_spark_range_count
4.89s setup    tests/test_pyspark.py::test_spark_range_count
2.37s call     tests/test_pyspark.py::test_group_and_sum
0.97s teardown tests/test_pyspark.py::test_group_and_sum
0.16s setup    tests/test_pyspark.py::test_group_and_sum

(1 durations < 0.005s hidden.  Use -vv to show these durations.)
============================== 2 passed in 15.02s ==============================
```

## Tips and Considerations

- Generally it's good to keep test data small and in-memory for fast execution but with Spark there likely will be a need to test file-based sources
- Use `pytest` fixtures for re-use
    - If the amount of fixtures become unwieldly, consider putting them in a `conftest.py`
- Try to keep tests self-contained as much as possible
- Provide descriptive names for each of the test functions

## References

[The corresponding Github repo](https://github.com/be-rock/pyspark-unit-tests)

### Makefile

```Makefile
# Makefile
.DEFAULT_GOAL := help
SHELL := /bin/bash
CMD := podman
IMAGE_NAME := spark-test

help: ## Show this help message
	@echo -e 'Usage: make [target] ...\n'
	@echo 'targets:'
	@egrep '^(.+)\:\ ##\ (.+)' ${MAKEFILE_LIST} | column -t -c 2 -s ':#'

.PHONY: build-image
build-image: ## build the container image
	$(CMD) build -t $(IMAGE_NAME) .

.PHONY: setup
setup: ## setup the basic project structure
	mkdir -p tests/ && touch pyproject.toml Containerfile tests/test_pyspark.py

.PHONY: test
test: ## run the unit tests
	$(CMD) run --rm $(IMAGE_NAME)
```