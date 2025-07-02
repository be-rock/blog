.DEFAULT_GOAL := help

help: ## Show this help message.
	@echo -e 'Usage: make [target] ...\n'
	@echo 'targets:'
	@egrep '^(.+)\:\ ##\ (.+)' ${MAKEFILE_LIST} | column -t -c 2 -s ':#'

.PHONY: clean
clean: ## clean up the public/ directory
	@echo "Cleaning up the public directory"
	rm -rf ./public

.PHONY: list-posts
list-posts: ## make a new post named "post-title" such as `make new-post title="post-title"`
	@echo "Listing posts ..."
	@find content/posts/ -type d

.PHONY: new-post
new-post: ## make a new post named "post-title" such as `make new-post title="post-title"`
	@echo "Creating a new post page bundle with title: $(title) ..."
	hugo new posts/$(title)/index.md

.PHONY: serve
serve: ## serve the site locally, including content marked as draft
	@echo "Starting local server"
	hugo server --buildDrafts
