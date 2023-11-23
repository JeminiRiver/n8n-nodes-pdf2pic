FROM n8nio/n8n
USER root
RUN apk add --update python3 py3-pip

# installs requests library
RUN python3 -m pip install requests

# upgrades pip (not necessary)
RUN python3 -m pip install --upgrade pip
