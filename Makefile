help: ## Show this help message.
	@echo -e 'Usage: make [target] ...\n'
	@echo 'targets:'
	@egrep '^(.+)\:\ ##\ (.+)' ${MAKEFILE_LIST} | column -t -c 2 -s ':#'

.PHONY: build
build: ## build the site
	@echo "Building the site..."
	hugo

.PHONY: clean
clean: ## clean the build artifacts
	@echo "Cleaning up build artifacts..."
	rm -rf public/

.PHONY: serve
serve: ## serve the site locally, including content marked as draft
	@echo "Starting local server at http://localhost:1313"
	hugo server --buildDrafts
