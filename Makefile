URI		:= auth-dev.mozilla.auth0.com
CLIENTID	:= 
CLIENTSECRET	:=

all:
	@echo 'Available make targets:'
	@grep '^[^#[:space:]].*:' Makefile

python-venv: venv
venv:
	$(shell [ -d venv ] || python3 -m venv venv)
	echo "# Run this in your shell to activate:"
	echo "source venv/bin/activate"

install:
	pip install -r requirements.txt


deploy-local:
	# Requires a credentials.json file to be present and valid
	# Useful for local tests
	uploader_rules.py -r rules

deploy:
	@echo "Deploying to $(URI)"
	uploader_rules.py -r rules -u $(URI) -c $(CLIENTID) -s $(CLIENTSECRET)


.PHONY: venv all install deploy
