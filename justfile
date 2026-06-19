default: run

test:
	bun run test

validate:
	bun run validate

build:
	bun run build

preview:
	bun run preview

run: test validate build preview
