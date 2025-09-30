---
title: "My Recent Python Toolkit"
date: 2025-09-29T21:00:24-05:00
draft: true
showToc: true
tags:
  - python
---

## Summary

The Python development toolkit has changed pretty dramatically over the recent years.

This post intends to provide a lightweight introduction to the tools that I've been using in my tooklit and then provides a sample project to demonstrate how they all might work together.

## The tools

- [Containerization](#containerization---podman) - `podman`
- [Linting & Formatting](#linting--formatting---ruff) - `ruff`
- [Orchestration](#orchestration---make) - `make`
- [Pre-commit](#pre-commit---prek) - `prek`
- [Testing](#testing---pytest) - `pytest`
- [Type Checking](#type-checking---ty)- `ty`
- [Python (virtual) environment management](#python-virtual-environment-management---uv) - `uv`

### Containerization - `podman`

I use `podman`, there are no licensing restrictions to be concerned about such as is the case with `docker`. Although if doing development on a Mac, the [apple/container project](https://github.com/apple/container) may win in the end.

### Linting & Formatting - `ruff`

`ruff` is a super fast Python library for linting, formatting, and others and can be a replacement for `black` (formatting), `isort` (for import sorting), etc.

### Orchestration - `make`

There are numerous tools that can serve the purpose of `make` and function as a command runner, such as `just` and `task` libraries but, although slightly more complicated, I feel that `make` wins here because of its availability. It's present on virtually all systems and LLMs have made it easy to get up and running if you need assistance with the syntax

### Pre-commit - `prek`

The `pre-commit` Python library has long been king in this area for, as the name suggests, ensuring certain conditions are met prior to a git commit succeeding. [The `prek` project](https://github.com/j178/prek) promises to be:

> 🚀 A single binary with no dependencies, does not require Python or any other runtime.
> ⚡ About 10x faster than pre-commit and uses only half the disk space.
> 🔄 Fully compatible with the original pre-commit configurations and hooks.
> ...
> - https://github.com/j178/prek?tab=readme-ov-file#features

### Testing - `pytest`

`pytest` shouldn't need much of an introduction but in my opinion it is easier to ready and more customizable than the built-in testing library.

### Type Checking - `ty`



### Python (virtual) environment management - `uv`

## References

### Makefile

```Makefile
.DEFAULT_GOAL := help
DOTFILES_DIR ?= ~/code/git/dotfiles
VENV_DIR=/tmp/venv

help: ## Show this help message.
	@echo 'Usage: make [target] ...'
	@echo 'targets:'
	@egrep '^(.+)\:\ ##\ (.+)' ${MAKEFILE_LIST} | column -t -c 2 -s ':#'

.PHONY: prereq
prereq: ## ensure prereqs are in place
	python3 -m venv ${VENV_DIR}
	${VENV_DIR}/bin/pip install --upgrade pip ansible

.PHONY: setup
setup: ## setup dotfiles
setup: prereq
	${VENV_DIR}/bin/ansible-playbook ansible/playbook.yml \
	  --inventory ansible/hosts.ini \
	  --extra-vars dotfiles_dir=${DOTFILES_DIR} \
	  --tags brew # --skip-tags apt
# 	  --tags all # --skip-tags apt
```