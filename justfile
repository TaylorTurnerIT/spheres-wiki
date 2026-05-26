default: pipeline

test:
	npm run test

validate:
	npm run validate

build:
	npm run build

preview:
	npm run preview

pipeline: test validate build preview
