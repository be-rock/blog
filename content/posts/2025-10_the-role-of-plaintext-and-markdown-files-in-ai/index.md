---
title: "The Role of plaintext and Markdown Files in AI-driven development"
date: 2025-11-01T22:02:06-05:00
draft: false
showToc: true
summary: "Using plaintext and Markdown Files in AI-driven development"
tags:
  - "AI"
  - prompt engineering
  - markdown
---

# Summary

Markdown files have long been the standards for documenting projects, explaining intent, and usage of an app.

When building apps with AI assistance like Cursor, Claude Code, OpenAI Codex, etc, Markdown and plaintext files can serve a different purpose.

Examples of these include:

- `llms.txt`
- Cursor rules
- `AGENTS.md` (and `CLAUDE.md`)

## llms.txt

`llms.txt` has a well-documented specification at [llmstxt.org/](https://llmstxt.org/). It most often sits at the root of the site such as `https://<site>/llms.txt` and serves as an index for LLMs to reference (primarily) during inference.

It is further described in the specification as (italics are added by me for emphasis):

> `robots.txt` and `llms.txt` have different purposes - `robots.txt` is generally used to let automated tools know what access to a site is considered acceptable, such as for search indexing bots. On the other hand, *`llms.txt` information will often be used on demand when a user explicitly requests information about a topic, such as when including a coding library’s documentation in a project, or when asking a chat bot with search functionality for information. Our expectation is that llms.txt will mainly be useful for inference*, i.e. at the time a user is seeking assistance, as opposed to for training. However, perhaps if llms.txt usage becomes widespread, future training runs could take advantage of the information in llms.txt files too.
> Source: https://llmstxt.org/#existing-standards

The `llms.txt` file is a basic markdown file and according to the spec, should like like this:

```markdown
# Title

> Optional description goes here

Optional details go here

## Section name

- [Link title](https://link_url): Optional link details

## Optional

- [Link title](https://link_url)
```
Source: https://llmstxt.org/#example

---

## Cursor rules

This convention is specific to the [Cursor IDE](https://cursor.com/) and can live in varying paths in your project. Here are some examples, assuming that `.` (current directory) is your base project directory:

- `./.cursor/rules/project-structure.mdc`
- `./backend/api/.cursor/rules/endpoint-details.mdc`

You can specify when you want the rule to be applied in the front-matter of the `.mdc` file. Here's an example of a file that would make sense to use at the base of a Python project:

```markdown
---
title: "Python style and typing"
description: "Enforce typing, docstrings, and formatting for Python files."
globs: ["**/*.py"]
alwaysApply: true
---

- Use Python typing annotations for all public functions and methods (both return types and parameter annotations).
- Add one-line docstrings for all public functions and modules; prefer Google style.
- Use snake_case for functions and variables, PascalCase for classes.
- Prefer pure functions and minimal side-effects.
- Use f-strings for formatting.
- Keep line length less than or equal to 88 characters and run `black --line-length 88`.
- Do not add or remove external dependencies without updating pyproject.toml/requirements.txt.
```

## AGENTS.md

`AGENTS.md` is also supported by Cursor and can be nested through a project directory structure in a similar way as the `.cursor/rules` convention described above. Claude Code accepts this file but according to [Claude Code: Best practices for agentic coding](https://www.anthropic.com/engineering/claude-code-best-practices), the preferred naming convention is `CLAUDE.md`.

The contents of this file becomes part of the prompt and can further clarify intent. There are some great recommendations on how to use `CLAUDE.md` effectively in [How I Use Every Claude Code Feature](https://blog.sshh.io/p/how-i-use-every-claude-code-feature) such as:

> - Your CLAUDE.md should start small, documenting based on what Claude is getting wrong
>
> - Don’t @-File Docs. If you have extensive documentation elsewhere, it’s tempting to @-mention those files in your CLAUDE.md. This bloats the context window by embedding the entire file on every run

# Takeaway

Plaintext and Markdown files are useful in AI tooling (like Cursor IDE) for documenting project structure, coding standards, and best practices. Conventions such as `.cursor/rules` and `AGENTS.md` (or `CLAUDE.md`) can be used to enforce each of these and improve communication for AI coding agents. Use small, focused documentation files and reference best practices to make the most of these features.
