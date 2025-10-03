---
title: "My Recent Python Toolkit"
date: 2025-09-29T21:00:24-05:00
draft: true
showToc: true
tags:
  - python
---

## Introduction

The Python development ecosystem has changed pretty dramatically over the recent years.

This post provides a practical introduction to the toolkit that I've been using, explaining why I chose each tool and how they work together.

## The Toolkit

- [Command Runner](#command-runner---make) - `make`
- [Configuration](#configuration---pydantic) - `pydantic`
- [Containerization](#containerization---podman) - `podman`
- [Continuous Integration](#continuous-integration---github-actions) - GitHub Actions
- [IDE](#ide-cursor-or-vs-code) - `cursor`
- [Linting & Formatting](#linting--formatting---ruff) - `ruff`
- [Load Testing](#load-testing---locust) - `locust`
- [Logging](#logging---logging) - `logging`
- [Pre-commit](#pre-commit---prek) - `prek`
- [Python project and environment management](#python-project-and-environment-management---uv) - `uv`
- [Scheduling](#scheduling---cron) - `cron`
- [Testing](#testing---pytest) - `pytest`
- [Type Checking](#type-checking---ty) - `ty`

### Command Runner - `make`

While not initially designed for this purpose, `make` works very well as a command runner. A `Makefile` can be created in your project root to represent common ways for your project to be used. It is also self-documenting and a helpful way for newcomers to get started with your project.

There are numerous tools that can serve the purpose of `make` and function as a command runner, such as `just` and `task` libraries but, although it may have a slightly more archaic syntax, I feel that `make` wins here because of its availability. It's present on virtually all systems and LLMs have made it easy to get up and running if you need assistance with the syntax.

Here's a list of common `make` targets that I use on my Python projects:

```makefile
.PHONY: help setup format lint test run build-image clean

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: ## Bootstrap the project and install dependencies
	uv init --no-readme
	uv add --dev pytest ruff ty
	uv sync

format: ## Format code with ruff
	uvx ruff format src/ tests/

lint: ## Lint code with ruff
	uvx ruff check src/ tests/

test: ## Run tests with pytest
	uvx pytest tests/ -v

run: ## Run the application
	uv run python -m src.main

build-image: ## Build container image with podman
	podman build -t my-python-app .

clean: ## Clean up generated files
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	rm -rf .pytest_cache/
```

Common targets I use:
- `make help` - Show available commands (self-documenting!)
- `make setup` - Bootstrap the project and install dependencies
- `make format` - Format code with ruff
- `make test` - Run tests
- `make build-image` - Build the container image

### Configuration - `pydantic`

`pydantic` provides type validation and settings management. I use it for configurations to ensure type safety / validation.

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):

    database_url: str = "app.db"

    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_debug: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )

# Usage
settings = Settings()
print(f"API will run on {settings.api_host}:{settings.api_port}")
```

The [pydantic settings documentation](https://docs.pydantic.dev/latest/concepts/pydantic_settings/#settings-management) has excellent examples for more complex configurations.

### Containerization - `podman`

I use `podman` for containerization since there are no licensing restrictions to be concerned about, unlike `docker`. For Mac development, the [apple/container project](https://github.com/apple/container) might be worth considering.


### Continuous Integration - GitHub Actions

GitHub Actions integrates well into a GitHub repo and starters are widely available for Python projects. Unless your company has an alternate CI solution, GitHub Actions should be the starting-point.

It can also be run locally use the awesome OSS https://github.com/nektos/act project.

### IDE (Cursor or VS Code)

Cursor is a great IDE because of its familiar VS Code-like interface and AI integration. Its website puts it this way:
> Built to make you extraordinarily productive, Cursor is the best way to code with AI.
> - cursor.com

### Linting & Formatting - `ruff`

`ruff` is a super fast Python linter and formatter that can used in place of other tools like `black` for formatting and `isort` for import sorting

Example usage:
```bash
# Format code
uvx ruff format src/

# Lint code
uvx ruff check src/

# Fix auto-fixable issues
uvx ruff check --fix src/
```

### Logging - `logging`

Although libraries like `loguru` are easier to use, have more bells-and-whistles, I feel that the standard library `logging` library has always been 'good enough' for what I need.

In this case, we will create a custom Python logger in `json` format for easier downstream parsing, if required.

```python
import datetime
import logging
import json
from typing import Any


class JsonFormatter(logging.Formatter):
    def format(self, record) -> str:
        log_record: dict[str, Any] = {
            "time": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='milliseconds'),
            "level": record.levelname,
            "msg": record.getMessage(),
            "logger": record.name,
        }
        return json.dumps(log_record)


def get_logger(
    logger_name: str = __name__,
    logger_level: int = logging.INFO,
    logging_formatter: JsonFormatter = JsonFormatter,
) -> logging.Logger:
    logger = logging.getLogger(logger_name)
    logger.setLevel(logger_level)
    handler = logging.StreamHandler()
    handler.setFormatter(logging_formatter())
    logger.addHandler(handler)
    return logger

logger = get_logger()
logger.info("This is an info message")
{"time": "2025-10-01T04:30:41.691+00:00", "level": "INFO", "msg": "This is an info message", "logger": "__main__"}
```

### Load Testing - `locust`

[locustio/locust](https://github.com/locustio/locust) is an excellent project for load testing with a built-in web UI. It shines when load testing APIs - the primary place I've used it, but it can be easily extensible to non-API use cases.

### Pre-commit - `prek`

The `pre-commit` Python library has long been king in this area for, as the name suggests, ensuring certain conditions are met prior to a git commit succeeding. [The `prek` project](https://github.com/j178/prek) promises to be:

> 🚀 A single binary with no dependencies, does not require Python or any other runtime.
> ⚡ About 10x faster than pre-commit and uses only half the disk space.
> 🔄 Fully compatible with the original pre-commit configurations and hooks.

As the name suggests, it is a git hook that is triggered prior to commits. It can be used to ensure that JSON, YAML files are formatted properly, check to ensure files end with a newline, check for merge conflicts, and more.

Here's a sample `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
      - id: check-merge-conflict

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.6
    hooks:
      - id: ruff
        args: [--fix, --exit-non-zero-on-fix]
      - id: ruff-format
```

Install and setup:
```bash
# Install prek
curl -L https://github.com/j178/prek/releases/latest/download/prek_linux_amd64.tar.gz | tar -xz
sudo mv prek /usr/local/bin/

# Install the hooks defined in the .pre-commit-config.yaml
prek install
```

### Python project and environment management - `uv`

`uv` makes managing dependencies easier and has other project-bootstrapping capabilities. Written in Rust, it's project dependency resolution, as an alternative to `pip install`. is significantly faster.

Here's some common (AI-generated) examples:

```bash
# Initialize a new project
uv init my-project
cd my-project

# Add dependencies
uv add fastapi uvicorn
uv add --dev pytest ruff

# Create and activate virtual environment
uv venv
source .venv/bin/activate  # On Unix/macOS

# Install dependencies
uv sync

# Run commands in the virtual environment
uv run python main.py
uv run pytest
uv run ruff check .

# Run tools without installing globally
uvx ruff format .
uvx ty check src/
```


### Scheduling - `cron`

`cron` is the ultimate 'keep it simple' scheduler and is widely available. When something more sophisticated is needed, Airflow may be the way to go, especially for data-centric jobs. But if 'keep it simple' is good enough, here's a crontab template file that I referenced for years.

```bash
# .---------------- minute (0 - 59)
# |  .------------- hour (0 - 23)
# |  |  .---------- day of month (1 - 31)
# |  |  |  .------- month (1 - 12) OR jan,feb,mar,apr ...
# |  |  |  |  .---- day of week (0 - 6) (Sunday=0 or 7)  OR sun,mon,tue,wed,thu,fri,sat
# |  |  |  |  |
# *  *  *  *  *  command to be executed
# *  *  *  *  *  command --arg1 --arg2 file1 file2 2>&1
```

### Testing - `pytest`

`pytest` shouldn't need much of an introduction but in my opinion it is both easier to read and more customizable than the built-in testing library.

Here's a simple (AI-Generated) example:

```python
# tests/test_user.py
import pytest
from src.models import User

class TestUser:
    def test_user_creation(self):
        user = User(name="John Doe", email="john@example.com")
        assert user.name == "John Doe"
        assert user.email == "john@example.com"

    def test_user_email_validation(self):
        with pytest.raises(ValueError):
            User(name="John Doe", email="invalid-email")

    @pytest.fixture
    def sample_user(self):
        return User(name="Jane Doe", email="jane@example.com")

    def test_user_with_fixture(self, sample_user):
        assert sample_user.name == "Jane Doe"
```

### Type Checking - `ty`

`ty` is a newer project that promises to be faster than alternatives such as `mypy` and can be run easily when paired with `uv`.

Basic usage:
```bash
uvx ty check src/
```

## Takeaways

While I'm not an expert in these tools, I've used them extensively (expert for new entries such as `ty`) and they've become my go-to choices for new Python projects.
