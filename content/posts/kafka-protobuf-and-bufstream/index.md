---
title: "Kafka and Protobuf with Bufstream"
date: 2025-08-05T22:29:16-05:00
draft: true
showToc: true
tags:
    - streaming
    - buf
    - kafka
    - protobuf
    - spark
---

## Summary

- Bufstream is said to be a drop-in replacement for Kafka via a simple Go-based binary
- Bufstream also standardizes on Protocol Buffers as the serialization format for messaging and integrates well with Lakehouses by writing directly to an Iceberg sink

## What is the point?

- I often work with streaming and Kafka with Apache Spark. Setting up and managing a Kafka cluster can be cumbersome so having a quick, easy, standardized, and leightweight way to run Kafka is appealing.
- This blog attempts to test the claims of Buf - the company behind
  - Bufstream - the "drop-in replacement for Kafka"
  - BSR - the Buf Schema Registry which implements the "Confluent Schema Registry API"
  - Buf CLI - a simple way to develop and manage Protobuf

## Getting Started

- On a surface-level, I have found the Buf docs to be nice and well written with 3 applicable quickstart guides that will be the basis for getting started
    - https://buf.build/docs/bufstream/quickstart/
    - https://buf.build/docs/bsr/quickstart/
    - https://buf.build/docs/cli/quickstart/

## Bufstream

### Installation

Starting with [this Bufstream quickstart guide](https://buf.build/docs/bufstream/quickstart/), we are advised to download the `bufstream` CLI with `curl` and then simply `./bufstream serve`. Let's see if that's as easy as it sounds.

```shell
❯ curl -sSL -o bufstream \
    "https://buf.build/dl/bufstream/latest/bufstream-$(uname -s)-$(uname -m)" && \
    chmod +x bufstream

❯ ./bufstream serve
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

The quickstart then recommends installing either either [AKHQ](https://akhq.io/) or [Redpanda console] for managing Kafka-compatible workloads. The Redpanda installation is a simple 4-liner `docker run` so I'll give that one a try.

```shell
❯ docker run -p 8080:8080 \
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
❯ docker run --network=host -p 8080:8080 \
    -e KAFKA_BROKERS=localhost:9092 \
    docker.redpanda.com/redpandadata/console:v3.1.3
...
{"level":"info","ts":"2025-08-06T04:08:00.900Z","msg":"started Redpanda Console","version":"v3.1.3","built_at":"1753360440"}
{"level":"info","ts":"2025-08-06T04:08:00.903Z","msg":"connecting to Kafka seed brokers, trying to fetch cluster metadata","seed_brokers":["localhost:9092"]}
{"level":"info","ts":"2025-08-06T04:08:00.910Z","msg":"successfully connected to kafka cluster","advertised_broker_count":1,"topic_count":0,"controller_id":1234570725,"kafka_version":"between v0.10.2 and v0.11.0"}
{"level":"info","ts":"2025-08-06T04:08:01.111Z","msg":"Server listening on address","address":"[::]:8080","port":8080}
```

I was then able to view the Redpanda console in my browser at http://localhost:8080/overview.

### Working with Protobuf and and the BSR

Continuing with the quickstart, I cloned the Github repo and moved the previously installed `bufstream` CLI to the cloned directory.

```shell
❯ git clone https://github.com/bufbuild/bufstream-demo.git && \
    mv bufstream ./bufstream-demo && \
    cd ./bufstream-demo
```

This repo contains pre-created Protobuf files that have integration and support for Confluence-compatabile schema registries (which BSR complies with).

## BSR (Buf Schema Registry)

## Buf CLI

## References

### Makefile