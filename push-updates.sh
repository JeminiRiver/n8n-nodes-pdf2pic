#!/bin/bash
username="pixelcoin"                 # docker username
image_name="n8n-python"              # docker image name

docker pull n8nio/n8n
docker build -t $username/$image_name .
docker push $username/$image_name    # you may need to set up docker first
                                     # with `docker login`.
