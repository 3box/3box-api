#!/bin/bash

docker build -t 3box-api:develop .
docker tag 3box-api:develop 967314784947.dkr.ecr.us-east-1.amazonaws.com/3box-api:develop
docker push 967314784947.dkr.ecr.us-east-1.amazonaws.com/3box-api:develop
aws ecs update-service --force-new-deployment --cluster  pinning-node-cluster-dev  --service profile-api-service-dev
