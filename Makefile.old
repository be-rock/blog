.DEFAULT_GOAL := help
VENV_DIR := .venv

help: ## Show this help message.
	@echo -e 'Usage: make [target]\n'
	@echo -e 'Targets:'
	@egrep '^(.+)\:\ ##\ (.+)' ${MAKEFILE_LIST} | column -t -c 2 -s ':#'

.PHONY: clean
clean: ## clean up venv and cache
	find . -type d -regextype sed -regex ".*/[build|dist|__pycache__|${VENV_DIR}|\.pytest_cache]" -delete
	find . -type f -regextype sed -regex ".*/[*.egg-info|*\.pyc|*\.pyo|*\.egg-link]" -delete

.PHONY: install
install: ## Install pip requirements (prod)
	${VENV_DIR}/bin/pip install --upgrade pip --requirement requirements.txt

.PHONY: prose
prose: ## Run the prose linter `proselint`
	${VENV_DIR}/bin/proselint --config ./proselint-config.json _posts/

setup: ## Setup the environment
setup: clean venv install

.PHONY: venv
venv: ## Create a python virtual environment
	python -m venv ${VENV_DIR}

