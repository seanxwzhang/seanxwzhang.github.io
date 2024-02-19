.PHONY: preview

preview:
	@echo "Previewing site..."
	quarto render && hugo server
