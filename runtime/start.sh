#!/bin/sh
set -eu

NPM_CONFIG_PREFIX="${NPM_CONFIG_PREFIX:-$HOME/.local}"
export NPM_CONFIG_PREFIX
export PATH="$NPM_CONFIG_PREFIX/bin:$PATH"

mkdir -p "$NPM_CONFIG_PREFIX/bin"

codex --version >/dev/null

multica daemon start

exec sleep infinity
