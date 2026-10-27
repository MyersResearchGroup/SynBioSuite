#!/bin/sh
# Regenerate backend/generated_v1/ from the OpenAPI spec, from scratch.
# Run from anywhere:  sh backend/codegen/generate.sh
set -eu
cd "$(dirname "$0")/.."    # backend/

rm -rf generated_v1
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD":/local \
  openapitools/openapi-generator-cli:v7.26.0 generate \
  -i /local/sbs_server/app/static/openapi.yaml -g python-flask \
  -t /local/codegen/templates -o /local/generated_v1 \
  --additional-properties=packageName=openapi_server,useConnexion3=true