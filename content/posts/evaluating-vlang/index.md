---
title: "Evaluating V (Language)"
date: 2025-08-25T19:39:16-05:00
draft: true
showToc: true
tags:
  - v language
  - languages
---

## Summary

- I enjoy learning new languages, and decided it would be fun to do some learning the 'old-school' way, meaning no AI-assisted coding, trial-and-error, and using the docs. Note - LLMs will be used merely as a search-engine equivalent to aid with solutions and resolve issues, but *not* to build a solution.
- I have worked with numerous languages in the past, but 2 that have been on my radar are [go](https://go.dev/) and [V](https://vlang.io/). This post will be about `V` but I hope to do something similar for `go`.

`V` promises to be stable (despite not yet having reached 1.0 release), easy to learn ("can be learned over the course of a weekend"), fast, and is statically typed.

## Learning V

### Getting started

#### Installation

Installation is pretty straight-forward, to clone, build from source, and symlink the executable just took a few seconds:

```shell
cd ~/.local/lib
time git clone --depth=1 https://github.com/vlang/v
cd v
time make
...
git clone --depth=1 https://github.com/vlang/v  0.60s user 0.77s system 18% cpu 7.314 total
...
V has been successfully built
V 0.4.11 603cd90
make  6.82s user 0.98s system 61% cpu 12.739 total

sudo ./v symlink
```

### Creating a project

Creating things is one of the best ways to learn. I'll go with the idea of a coin flipper app. It is a simple concept and can be used in a variety of ways to explore the language. I have previously done this with Python as a basis of advancing knowledge of TDD, and several Architectural patterns. A coin flipper is one of the suggestions made in this repo:

> Coin Flip Simulation - Write some code that simulates flipping a single coin however many times the user decides. The code should record the outcomes and count the number of tails and heads.
> Source: https://github.com/karan/Projects

The beauty of a simple concept like this is that it can be the basis for so many things such as adding a REST API, a front-end, a CLI, database interactions, ...

### Starting the project

There are numerous types of project templates bundled with the `v` CLI to get started with. The default is `bin`. `v new --help` shows 3 built-in:

```shell
  --bin               Use the template for an executable application [default].
  --lib               Use the template for a library project.
  --web               Use the template for a vweb project.
```

I'll start with the default (`--lib`) because it includes tests.

```shell
v new --lib coin_flipper
Input your project description: a coin flipper app
Input your project version: (0.0.0)
Input your project license: (MIT)
Initialising ...
Created library project `coin_flipper`

tree
.
├── coin_flipper
│   ├── coin_flipper.v
│   ├── tests
│   │   └── square_test.v
│   └── v.mod
└── Makefile

3 directories, 4 files
```

The contents of these files are:

```v
// coin_flipper/coin_flipper.v
module coin_flipper

// square calculates the second power of `x`
pub fn square(x int) int {
    return x * x
}
```

```v
// coin_flipper/tests/square_test.v
import coin_flipper

fn test_square() {
	assert coin_flipper.square(2) == 4
}
```

```mod
// v.mod
Module {
	name: 'coin_flipper'
	description: 'a coin flipper app'
	version: '0.0.0'
	license: 'MIT'
	dependencies: []
}
```

To run the project:

```shell
v run coin_flipper
coin_flipper/coin_flipper.v:1:1: error: project must include a `main` module or be a shared library (compile with `v -shared`)
```

Strangely, it does not run. Adding a `main.v` file seems to resolve this:

```v
// coin_flipper/main.v
import coin_flipper

fn main() {
    println(coin_flipper.square(3))
}
```

```shell
v run coin_flipper
9
```

Ok, we have a successful app that works, although it does not yet flip a coin, it performs some basic useful tasks that we can build upon.

### Learning the language

I have spent some time browsing through the docs and testing in the bundled REPL via `v repl` (or just `v`, which also defaults to the repl) but usually find it best just to dig in.

The first thing I'd like to do is build the coin flipping logic into our tests in a TDD sort of manner.

In Python, I would probably start with something like:

```python
# tests/test_app.py
def test_app():
    import random
    def coin_flipper() -> str:
        return random.choice(['heads', 'tails'])
    assert coin_flipper() in ['heads', 'tails']
```

And then run the tests. Upon success, we would move the `coin_flipper()` to a new module and then import the module into the `test_app.py` like:

```python
# tests/test_app.py
import coin_flipper

def test_app():
    assert coin_flipper() in ['heads', 'tails']
```

Eventually the `coin_flipper()` function could later be refactored into a `CoinFlipper` class with a `flip_coin()` method if needed.

To do the same thing in `v`, this became:

```v
// tests/coin_flipper_test.v
fn flip_coin() !string {
    return rand.element(['heads', 'tails'])!
}

fn test_flip_coin() {
	result := flip_coin()!
	assert result in ['heads', 'tails']
}
```

Running the tests with `v -stats test tests/` succeeded. Through trial and error, I learned about the `!` behavior in `V` and that simply returning type `string` from the function was not acceptable because `rand.element()` actually returns `!string` which, I understand to mean that it can return null *or* string.

The [`rand` module docs](https://modules.vlang.io/rand.html#element) say that `rand.element`'s signature is: `fn element[T](array []T) !T`. I interpret this to mean that `element` takes an array of any type `T` and returns type `!T` which means it can return type `T` or an error/none.

So our `fn flip_coin()` returns `!string` to accomodate this. Another way to address this, without the `!` symbol would be to add the `or {'none'}`:

```v
fn flip_coin() string {
    return rand.element(['heads', 'tails']) or {'none'}
}

fn test_flip_coin() {
	result := flip_coin()
	assert result in ['heads', 'tails']
}
```

Once these tests succeed, we can further refactor the code such that the `flip_coin` function is moved to `coin_flipper/coin_flipper.v` and then imported to the `tests/coin_flipper_test.v` such as:

```v
// coin_flipper/coin_flipper.v
module coin_flipper

import rand

pub fn flip_coin() string {
	return rand.element(['heads', 'tails']) or {'none'}
}
```

```v
// tests/coin_flipper_test.v
import coin_flipper

fn test_flip_coin() {
	result := coin_flipper.flip_coin()
	assert result in ['heads', 'tails']
}
```

And then `main.v` simply:

```v
import coin_flipper

fn main() {
	println(coin_flipper.flip_coin())
}
```

### Running and Compiling the project

To run the project, you can `v run .`. To run *and* compile, change to  `v crun .`. `crun`. In my case, the compiled library was `coin-flipper-v`.

Here's a quick example of runtime differences between `v run` in a shell `for` loop and an execution of the built binary which shows that the binary is, unsurprisingly, considerably faster.

```shell
# ./coin-flipper-v
/usr/bin/time -p zsh -c 'for i in {1..1000}; do ./coin-flipper-v > /dev/null ; done'
real 3.09
user 0.01
sys 0.13

# v run
/usr/bin/time -p zsh -c 'for i in {1..1000}; do v run . > /dev/null; done'
real 427.76
user 0.23
sys 0.26
```

### Expanding the app

Once I get a chance, I would like to enhance this app in a few ways such as:

- Add a web component such as a REST API with [veb](https://modules.vlang.io/veb.html)
- Provide flexiblity to the app user to give a dynamic number of inputs
- Write the coin flip results to a SQL database https://modules.vlang.io/db.sqlite.ht

This is just a toy app and each of the above components

## Wrapping up

This was a super quick intro to `V`. It was a language that I had wanted to dive into and have some surface-level knowledge of. I really enjoyed navigating through the docs, reviewing the examples, prototyping in the REPL.

I've gotten a better sense of the basic data structures, the project structure and packaging, error handling, and more.

I felt that the language, thus far, has been intuitive. If a syntax or paradigm was new or unfamiliar, it made sense in a short amount of time with review.

## Reference

Following is a helper `Makefile` that was used in the

```Makefile
.DEFAULT_GOAL := help
APP_NAME ?= coin_flipper

help: ## Show this help message.
	@echo 'Usage: make [target] ...'
	@echo 'targets:'
	@egrep '^(.+)\:\ ##\ (.+)' ${MAKEFILE_LIST} | column -t -c 2 -s ':#'

.PHONY: setup
setup: ## setup a new lib project
	v new --lib ${APP_NAME}

.PHONY: run
run: ## run the app
	v run .

.PHONY: crun
crun: ## crun (compile and run) the app
	v crun .

.PHONY: test
test: ## test the app
	v -stats test tests/
```
