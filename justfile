default: run

test:
	npm run test

validate:
	npm run validate

build:
	npm run build

preview:
	npm run preview

run: test validate build preview
