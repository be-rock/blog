---
title: "Streaming with Bufstream, Protobuf, and Spark"
date: 2025-08-09T22:29:16-05:00
draft: false
showToc: true
tags:
    - bufstream
    - kafka
    - protobuf
    - spark
    - streaming
---

## Summary

- Bufstream is said to be a drop-in replacement for Kafka via a simple Go-based binary
- Bufstream also standardizes on Protocol Buffers as the serialization format for messaging and integrates well with Lakehouses by writing directly to an Iceberg sink

## What is the point?

- I often work with streaming and Kafka with Apache Spark. Setting up and managing a Kafka cluster can be cumbersome so having a quick, easy, standardized, and leightweight way to run Kafka is appealing.
- This blog attempts to test the claims of Buf - the company behind:
  - `Bufstream` - the "drop-in replacement for Kafka"
  - `BSR` - the Buf Schema Registry which implements the Confluent Schema Registry API
  - `buf` CLI - a simple way to develop and manage Protobuf

Note that the `buf` CLI will be referenced in this blog, but less of a focus.

## Getting Started

- On a surface-level, I have found the Buf docs to be nice and well written with 4 applicable quickstart guides that will be the basis for getting started
    - https://buf.build/docs/bufstream/quickstart/
    - https://buf.build/docs/bsr/quickstart/
    - https://buf.build/docs/cli/quickstart/
    - https://buf.build/docs/bufstream/iceberg/quickstart/

## Bufstream

### Installation

Starting with [this Bufstream quickstart guide](https://buf.build/docs/bufstream/quickstart/), we are advised to download the `bufstream` CLI with `curl` and then simply `./bufstream serve`. Let's see if that's as easy as it sounds.

```shell
curl -sSL -o bufstream \
    "https://buf.build/dl/bufstream/latest/bufstream-$(uname -s)-$(uname -m)" && \
    chmod +x bufstream

./bufstream serve
...
<snipped>
...
time=2025-08-05T22:45:14.648-05:00 level=INFO msg="kafka server started" host=localhost port=9092 tls=false public=true
time=2025-08-05T22:45:14.648-05:00 level=INddFO msg="kafka server started" host=127.0.0.1 port=9092 tls=false
time=2025-08-05T22:45:14.648-05:00 level=INFO msg="kafka server started" host=::1 port=9092 tls=false
time=2025-08-05T22:45:14.664-05:00 level=INFO msg="updating ownership" oldShardNum=0 oldShardCount=0 shardNum=0 shardCount=1
```

Ok, that really was quite easy.

### Setting up a web-based Kafka Administrative Console (optional)

The quickstart then recommends installing either either [AKHQ](https://akhq.io/) or [Redpanda console](https://docs.redpanda.com/current/console) for managing Kafka-compatible workloads. The Redpanda installation is a simple 4-liner `docker run` so I'll give that one a try.

```shell
docker run -p 8080:8080 \
    -e KAFKA_BROKERS=host.docker.internal:9092 \
    -e KAFKA_CLIENTID="rpconsole;broker_count=1;host_override=host.docker.internal" \
    docker.redpanda.com/redpandadata/console:v3.1.3
...
<snipped>
...
{"level":"warn","ts":"2025-08-06T03:56:19.199Z","msg":"failed to test Kafka connection, going to retry in 1s","remaining_retries":5}
...
{"level":"fatal","ts":"2025-08-06T03:56:51.007Z","msg":"failed to start console service","error":"failed to test kafka connectivity: failed to test kafka connection: failed to request metadata: unable to dial: dial tcp: lookup host.docker.internal on 10.0.2.3:53: no such host"}
```

Hmmm, that did not work as expected. I am testing on Linux and believe that the quickstart presumes we're running MacOS. I have also seen subtle network differences in the past when working with Docker (ok, Podman) on Linux. This eventually worked:

```shell
docker run --network=host -p 8080:8080 \
    -e KAFKA_BROKERS=localhost:9092 \
    docker.redpanda.com/redpandadata/console:v3.1.3
...
{"level":"info","ts":"2025-08-06T04:08:00.900Z","msg":"started Redpanda Console","version":"v3.1.3","built_at":"1753360440"}
{"level":"info","ts":"2025-08-06T04:08:00.903Z","msg":"connecting to Kafka seed brokers, trying to fetch cluster metadata","seed_brokers":["localhost:9092"]}
{"level":"info","ts":"2025-08-06T04:08:00.910Z","msg":"successfully connected to kafka cluster","advertised_broker_count":1,"topic_count":0,"controller_id":1234570725,"kafka_version":"between v0.10.2 and v0.11.0"}
{"level":"info","ts":"2025-08-06T04:08:01.111Z","msg":"Server listening on address","address":"[::]:8080","port":8080}
```

I was then able to view the Redpanda console in my browser at http://localhost:8080/overview.

### Working with Protobuf and the BSR

Continuing with the quickstart, I cloned the Github repo and moved the previously installed `bufstream` CLI to the cloned directory.

```shell
git clone https://github.com/bufbuild/bufstream-demo.git && \
    mv bufstream ./bufstream-demo && \
    cd ./bufstream-demo
```

This repo contains pre-created Protobuf files that have integration and support for Confluent-compatabile schema registries (which BSR complies with).

An example proto file is in `proto/bufstream/demo/v1/demo.proto` of the cloned repo and defines an `EmailUpdated` message.

Things get a little unclear here but from what I understand, this `demo.proto` file imports a reference to a confluent module with `import "buf/confluent/v1/extensions.proto";` and this is what enables the BSR to be compatible with Confluent schema registry. The mapping between the proto file and the topic is done with `    name: "email-updated-value"`. So the topic name here becomes `email-updated`.

### Producing and Consuming data

The quickstart references a `go run ./cmd/bufstream-demo-produce ...` and `go run ./cmd/bufstream-demo-consume ...` but I've noticed that the cloned repo comes with a `Makefile`. That would be simpler to use here but the produce/consume commands seem to be out of sync so we'll stick with what the demo suggests to be safe.

```shell
go run ./cmd/bufstream-demo-produce \
  --topic email-updated \
  --group email-verifier \
  --csr-url "https://demo.buf.dev/integrations/confluent/bufstream-demo"
go run ./cmd/bufstream-demo-produce --topic email-updated --group email-verifier
go: downloading github.com/brianvoe/gofakeit/v7 v7.3.0
go: downloading github.com/google/uuid v1.6.0
...
<downloading lots of go libs here>
...
time=2025-08-06T22:41:20.299-05:00 level=INFO msg="produced semantically invalid protobuf message" id=072da6ca-8878-4c11-944b-5876a4fc4370
time=2025-08-06T22:41:20.450-05:00 level=INFO msg="produced invalid data" id=32bc2119-f1bb-43f4-a9db-28fbb04ff7b5
time=2025-08-06T22:41:21.588-05:00 level=INFO msg="produced semantically valid protobuf message" id=d6fc0bf3-e13b-421f-a696-212059d7961d
...
```

So a lot of data is being generated, some of which is considered semantically invalid. Looking in the RedPanda console, I can see sample data such as `foobar` as well as other sample data such as `$f4525add-da7d-4b2b-aae9-884e7bab535dgarnettwunsch@dickens.netllama`, it's clear which of these 2 do not conform to the proto schema.

Now I'll try the `make` target `make consume-run` and see what happens since this is consistent with the snippet in the blog (unlike the produce).

```shell
make consume-run
go run ./cmd/bufstream-demo-consume --topic email-updated --group email-verifier \
	--csr-url "https://demo.buf.dev/integrations/confluent/bufstream-demo"
make consume-run
go run ./cmd/bufstream-demo-consume --topic email-updated --group email-verifier \
	--csr-url "https://demo.buf.dev/integrations/confluent/bufstream-demo"
time=2025-08-06T22:48:44.981-05:00 level=INFO msg="starting consume"
time=2025-08-06T22:48:44.982-05:00 level=INFO msg="consumed message with new email sisterglover@labadie.biz and old email orvilledickinson@turcotte.biz"
time=2025-08-06T22:48:45.984-05:00 level=INFO msg="consumed message with new email hound and old email antoniomurphy@bradtke.info"
time=2025-08-06T22:48:45.984-05:00 level=INFO msg="consumed malformed data" error="registration is missing for encode/decode" length=7
...
```

The log message `consumed malformed data` makes it sound like the consumer is consuming the data even if it is malformed and does not conform to the schema. This seems unexpected but I may have a misunderstanding on how this works.

The quickstart then suggests to run:
```shell
./bufstream serve --config config/bufstream.yaml
```

...which now seems to tie it all together by ensuring that the consumer has a connection to the BSR and ensuring that the Consumer only sees records that comply with the registered schema. I verified that schema enforcement does seem to be happening here by reviewing the terminal output for the producer and consumer. The Producer shows invalid records (e.g. does not conform to the schema):

```shell
# sample invalid log message from the producer
time=2025-08-09T22:36:50.224-05:00 level=ERROR msg="error on produce of invalid data" error="failed to produce: INVALID_RECORD: This record has failed the validation on the broker and hence been rejected."
```

...but the Consumer logs, *only* showed valid messages such as:

```shell
# sample valid log message from the consumer
time=2025-08-09T22:36:45.222-05:00 level=INFO msg="consumed message with new email monkey and old email ernestlegros@parisian.name"
```

## Bufstream and Apache Spark

If Bufstream really is a drop-in replacement for Apache Kafka, reading from Bufstream with Spark should also be straight-forward. Let's confirm this.


```python
from pyspark.sql import DataFrame
from pyspark.sql import functions as sf
from pyspark.sql.streaming.readwriter import DataStreamWriter
from pyspark.sql.streaming.query import StreamingQuery

KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"
TOPIC = "email-updated"

df: DataFrame = (
    spark
    .readStream
    .format("kafka")
    .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP_SERVERS)
    .option("subscribe", TOPIC)
    .option("startingOffsets", "earliest")
    .load()
    .selectExpr("CAST(key AS STRING)", "CAST(value AS STRING)")
)

datastream_writer: DataStreamWriter = (
    df
    .select("value")
    .writeStream
    .format("console")
    .option("truncate", "false")
)

streaming_query: StreamingQuery = datastream_writer.start()

-------------------------------------------
Batch: 0
-------------------------------------------
+---------------------------------------------------------------------------------------------+
|value                                                                                        |
+---------------------------------------------------------------------------------------------+
|\n$926b3e7f-0311-4b0e-8925-e49b653e3f95jacqueskoss@lehner.info�alexisgraham@raynor.com    |
|\n$c0ec4ae6-d7c0-49d0-96f3-f45e5df45e78jewelrohan@strosin.org�salmon                      |
|foobar                                                                                      |
|\n$a1d8b79c-87c5-4dde-9183-b702e5b5b334marshallreynolds@armstrong.io�ericklittle@lang.name|
|\n$ab20b911-7bee-4fe9-8366-6211766412dfgissellejohnston@runolfsson.org�\vgrasshopper       |
|foobar                                                                                      |
|\n$f89d1a48-2d9b-4d77-a872-d39be4c61921rickybechtelar@stamm.net�raoulbeahan@rutherford.io |
|\n$8af0f411-c2ed-494d-ac82-e495b111045austinanitzsche@lebsack.net�\bplatypus              |
|foobar                                                                                      |
|\n$a58f1996-c6b2-416b-8531-a603921dd828marisafunk@towne.net�blakerippin@kemmer.biz        |
|\n$48fa5f74-5921-4061-ad25-559ce2cb6e7aeleonoreupton@rohan.net�wasp                       |
|foobar
...
```

So this appeared to work at a very basic level, but this is not how we should be performing reads via Spark given that we want our consumers to know and cross-reference the expected schema defined in the BSR. Given that we confirmed this worked as expected with the above Consumer, we will for now presume that this capability is possible with Spark as well and leave the full Spark --> BSR integration for later research.

## What about Iceberg?

I followed the [Iceberg quickstart](https://buf.build/docs/bufstream/iceberg/quickstart) but it seems like the compose file is referencing a `spark/` directory that doesn't exist: `OSError: Dockerfile not found in /home/username/tmp/buf-examples/bufstream/iceberg-quickstart/spark` .So I couldn't get this working but according to the guide, all you need is:
- Bufstream broker
- object storage
- an Iceberg catalog implementation

The details of your Iceberg catalog are defined in `config/bufstream.yaml`.

## What about Bufstream in Production?

The initial impression I had of Bustream is that deployments are super simple. I suppose this is true, in comparison to a Kafka deployment, but it still requires:

- Object storage such as AWS S3, Google Cloud Storage, or Azure Blob Storage.
- A metadata storage service such as PostgreSQL.

There are numerous different deployment options such as Docker, Helm, and others with a provided Terraform module. It's unclear if BSR requires an additional set of deployments or if that is integrated into Postgres.

## Recap

- Buf's vision seems well-thought and clearly-defined.
    - A simplified Kafka-compatible streaming engine
    - A single way to manage schemas with Protobuf
    - Schema enforcement with the BSR
    - Data Lakehouse integration with Apache Iceberg
- The streaming market has no shortage of vended options but Buf's vision really makes it stand out.
- Protobuf has the reputation for being less user-friendly than other serialization formats like JSON but this may change if the `buf` CLI can keep it's promises of simplifying the schema mangement experience.
