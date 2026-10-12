#!/bin/sh
# Regenerate backend/codegen_server_oag/ from the OpenAPI spec, from scratch.
#
#   sh codegen/generate.sh        (from backend/)
#
# The output directory is deleted first: nothing hand-written lives in it.
# Hand-written code is in sbs_server/app/api/impl/; the templates and settings
# are beside this script.
set -eu

# OpenAPI Generator v7.26.0, pinned by digest.
IMAGE='openapitools/openapi-generator-cli@sha256:a304ddf1e2e5f24f68fa3153568d6174cea4959d09aa8e3db6d526fd0782326d'
OUTPUT='codegen_server_oag'

cd "$(dirname "$0")/.."

rm -rf "$OUTPUT"
mkdir "$OUTPUT"
# The generator honours an ignore file it finds in the output directory. Its
# --ignore-file-override option had no effect with this version.
cp codegen/openapi-generator-ignore "$OUTPUT/.openapi-generator-ignore"

docker run --rm --user "$(id -u):$(id -g)" -v "$PWD":/work "$IMAGE" generate \
    -i /work/sbs_server/app/static/openapi.yaml \
    -c /work/codegen/config.yaml \
    -o "/work/$OUTPUT"
