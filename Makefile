.DEFAULT_GOAL := help

help: ## Show this help message.
	@echo -e 'Usage: make [target] ...\n'
	@echo 'targets:'
	@egrep '^(.+)\:\ ##\ (.+)' ${MAKEFILE_LIST} | column -t -c 2 -s ':#'

.PHONY: clean
clean: ## clean up the `public/` directory
	@echo "Cleaning up the public directory"
	rm -rf ./public

.PHONY: list-posts
list-posts: ## list all previously created posts
	@echo "Listing posts ..."
	@find content/posts/ -type d

.PHONY: new-post
new-post: ## make a new post named "post-title" such as `make new-post title="post-title"`
	@echo "switching to main branch and git pull ..."
	git switch main
	git pull
	@echo "Creating a new git branch called $(title)"
	git switch -c $(title)
	@echo "Creating a new post page bundle with title: $(title) ..."
	hugo new posts/$(title)/index.md

.PHONY: serve
serve: ## serve the site locally, including content marked as draft
	@echo "Starting local server"
	hugo server --watch --buildDrafts
