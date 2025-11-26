---
title: "Databricks Declarative Pipelines via DAB"
date: 2025-11-23T13:33:06-06:00
draft: false
tags:
  - databricks
  - databricks asset bundles (dab)
  - declarative pipelines
  - spark
---

This blog will provide an overview of how to use a DAB (Databricks Asset Bundle) template to provision a Declarative Pipeline.

## Setup

A DAB project can be established from a template to ensure consistencies among related projects. DAB templates follow a Go package template syntax, as described in the [DAB Template Tutorial docs](https://docs.databricks.com/aws/en/dev-tools/bundles/template-tutorial).

In this example, we'll create a Pipeline project template with this structure

```text
template_example
├── databricks_template_schema.json
├── README.md
└── template
    ├── databricks.yml.tmpl
    ├── resources
    │   └── pipeline.yml.tmpl
    └── src
        └── pipeline.py.tmpl
```

The `databricks_template_schema.json` file defines template values that are later interpolated into the other project files. For example, you could have a variable like `catalog_name` that is then interpolated into each template that references it such as: `TARGET_CATALOG = "{{.catalog_name}}"`.

```json title="databricks_template_schema.json"
{
    "properties": {
        "project_name": {
            "type": "string",
            "default": "dab_2025-11-23",
            "description": "The name of the project folder and bundle",
            "order": 1
        },
        "pipeline_name": {
            "type": "string",
            "default": "my_pipeline_2025-11-23",
            "description": "The unique name of the DLT pipeline",
            "order": 2
        },
        "catalog_name": {
            "type": "string",
            "default": "workspace",
            "description": "Target Unity Catalog for data",
            "order": 3
        }
    }
}
```

The `template/` directory then contains 3 primary things:

1. The project-level `databricks.yml`
2. One or more resource files in `resources/`
3. One or more source code files in `src/`

```yaml
# databricks.yml.tmpl
bundle:
  # User input: project_name
  name: {{.project_name}}

include:
  - resources/*.yml
  - resources/*/*.yml

# Variable declarations. These variables are assigned in the dev/prod targets below.
variables:
  catalog:
    description: The catalog to use
    default: workspace
  schema:
    description: The schema to use
    default: ${workspace.current_user.short_name}

targets:
  dev:
    mode: development
    default: true

  prod:
    mode: production
    variables:
      schema: prod
```

```yaml
# pipeline.yml.tmpl
resources:
  pipelines:
    {{.pipeline_name}}:
      catalog: ${var.catalog}
      schema: ${var.schema}
      serverless: true
      root_path: "../src"

      libraries:
        - glob:
            include: ../src/**
      channel: PREVIEW
```

```python
# pipeline.py.tmpl
from pyspark import pipelines as dp

# We can inject the catalog name directly into the code
TARGET_CATALOG = "{{.catalog_name}}"

@dp.table(
    comment="Raw data landing in " + TARGET_CATALOG
)
def raw_users():
    return spark.range(10)
```

## Using the template

Now if we want to use this defined template somewhere, we can reference the template when initializing a new DAB project using `databricks bundle init /path/to/template/directory`. For example:

```shell
❯ db bundle init /path/to/template/directory
The name of the project folder and bundle [dab_2025-11-23]:
The unique name of the DLT pipeline [my_pipeline_2025-11-23]:
Target Unity Catalog for data [workspace]:
✨ Successfully initialized template
```

We could then confirm that our bundle is valid via:

```shell
❯ db bundle validate
Name: dab_2025-11-23
Target: dev
Workspace:
  User: myusername@gmail.com
  Path: /Workspace/Users/myusername@gmail.com/.bundle/dab_2025-11-23/dev

Validation OK!
```

## Deploying the bundle

And then to deploy the bundle to the Workspace:

```shell
❯ db bundle deploy --target dev
Uploading bundle files to /Workspace/Users/myusername@gmail.com/.bundle/dab_2025-11-23/dev/files...
Deploying resources...
Updating deployment state...
Deployment complete!
```

And finally, to run the bundle:

```shell
❯ db bundle run
Update URL: https://myworkspaceurl.cloud.databricks.com/#joblist/pipelines/d9d9c4c8-0949-43e1-8180-329c0c8e22c1/updates/68d9c643-f91a-4ca7-8c43-791516dfe78a

2025-11-25T03:48:31.238Z update_progress INFO "Update 68d9c6 is INITIALIZING."
2025-11-25T03:48:34.072Z update_progress INFO "Update 68d9c6 is SETTING_UP_TABLES."
2025-11-25T03:48:38.518Z update_progress INFO "Update 68d9c6 is RUNNING."
2025-11-25T03:48:38.529Z flow_progress   INFO "Flow 'workspace.myusername.raw_users' is QUEUED."
2025-11-25T03:48:38.566Z flow_progress   INFO "Flow 'workspace.myusername.raw_users' is PLANNING."
2025-11-25T03:48:39.103Z flow_progress   INFO "Flow 'workspace.myusername.raw_users' is STARTING."
2025-11-25T03:48:39.161Z flow_progress   INFO "Flow 'workspace.myusername.raw_users' is RUNNING."
2025-11-25T03:48:43.764Z flow_progress   INFO "Flow 'workspace.myusername.raw_users' has COMPLETED."
2025-11-25T03:48:43.885Z update_progress INFO "Update 68d9c6 is COMPLETED."
Update ID: 68d9c643-f91a-4ca7-8c43-791516dfe78a
```

## Summary

So with this approach we can quickly and easily make new pipelines that are structurally known and well-understood. I have found this really helpful for quickly testing and prototyping Pipelines.

The code for this example can be found [here](https://github.com/be-rock/blog/tree/main/code/databricks-declarative-pipelines-via-dab).