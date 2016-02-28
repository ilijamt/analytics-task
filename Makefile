NODE_MODULES = ./node_modules
BIN = $(NODE_MODULES)/.bin

.PHONY: all
all:

.PHONY: setup
setup:
	npm install

.PHONY: eslint-html
eslint-html:
	$(BIN)/eslint . --output-file ./build/eslint.html --format html

.PHONY: eslint
eslint:
	$(BIN)/eslint . --fix

.PHONY: jscs
jscs:
	$(BIN)/jscs . --config .jscsrc

.PHONY: jscs-xml
jscs-xml:
	$(BIN)/jscs . --config .jscsrc --reporter checkstyle > ./build/jscs.xml
