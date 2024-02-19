SHELL := /bin/zsh
.PHONY: update dev

update:
	@echo "Updating from notion..." \
	source .env.local && \
	yarn build

dev:
	@echo "Starting development server..." \
	source .env.local && \
	yarn build && \
	yarn start
	
build: update