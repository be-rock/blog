# Using Delta Lake with Apache Spark

- [Using Delta Lake with Apache Spark](#using-delta-lake-with-apache-spark)
  - [Overview](#overview)
  - [How it works](#how-it-works)
    - [Download a Spark Distribution](#download-a-spark-distribution)
    - [Create a Pyspark helper shell script](#create-a-pyspark-helper-shell-script)
    - [Start Pyspark (with jupyterlab)](#start-pyspark-with-jupyterlab)
  - [Delta Lake Features](#delta-lake-features)
    - [Constraints](#constraints)

## Overview


> [According to the Delta Lake Introduction Docs](https://docs.delta.io/latest/delta-intro.html) Delta Lake is an open source project that enables building a Lakehouse architecture on top of data lakes. Delta Lake provides ACID transactions, scalable metadata handling, and unifies streaming and batch data processing on top of existing data lakes, such as S3, ADLS, GCS, and HDFS.

This blog will intend to break down a few of these core features, provide examples, and give a quick sense as to why open table formats such as Delta Lake have added benefits over purely columnar file formats like parquet in a data lake.

## How it works

The [Delta Lake Quick Start](https://docs.delta.io/latest/quick-start.html) provides some examples on how to set things up but for the following examples, I've taken the following appoach:

1. Download a distribution of Apache Spark site
2. Create a little helper shell script to start Spark and download the required Delta libraries
3. Use Delta with Apache Spark

### Download a Spark Distribution

An Apache Spark tarball can be downloaded from https://spark.apache.org/downloads.html and extracted into a directory of your choosing. The directory that the tarball is extracted to becomes your `SPARK_HOME`. If the tarball was extracted in `/var/lib/` the `SPARK_HOME` should be set like so:

```shell
export SPARK_HOME=/var/lib/spark-3.4.1-bin-hadoop3/
```

...where the target directory differs based on the version of Spark.

The Pyspark shell could then be started like:

```shell
$SPARK_HOME/bin/pyspark
```

### Create a Pyspark helper shell script

Let's install jupyter into a virtual environment and then download the Delta libraries of interest. Here's a snippet to create a shell script called `start_pyspark.sh` to do that:

```shell
# install jupyter into a virtual environment
python -m venv .venv
```

```shell
# start_pyspark.sh
DELTA_VERSION=2.4.0
DEPENDENCIES=(
    io.delta:delta-core_2.12:$DELTA_VERSION
)
VENV_DIR=.venv

echo "activating python venv $VENV_DIR ..."
source $VENV_DIR/bin/activate
echo "the active venv is using python version $($(which python) --version) ..."

export PYSPARK_DRIVER_PYTHON=$(which jupyter-lab)
export PYSPARK_DRIVER_PYTHON_OPTS="--TerminalInteractiveShell.editing_mode=vi"
export PYSPARK_PYTHON=$(which python)
export SPARK_LOCAL_IP="localhost"
export SPARK_HOME="${SPARK_HOME:-$1}"

$SPARK_HOME/bin/pyspark \
    --packages $DEPENDENCIES \
    --conf "spark.sql.extensions=io.delta.sql.DeltaSparkSessionExtension" \
    --conf "spark.sql.catalog.spark_catalog=org.apache.spark.sql.delta.catalog.DeltaCatalog"
```

### Start Pyspark (with jupyterlab)

```shell
./start_pyspark.sh
```

## Delta Lake Features

### Constraints

