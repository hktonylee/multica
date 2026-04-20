#!/bin/sh
set -eu

NPM_CONFIG_PREFIX="${NPM_CONFIG_PREFIX:-$HOME/.local}"
export NPM_CONFIG_PREFIX

codex_bin="$NPM_CONFIG_PREFIX/bin/codex"

if [ ! -x "$codex_bin" ]; then
	mkdir -p "$NPM_CONFIG_PREFIX/bin"
	echo "Codex CLI not found; installing @openai/codex..."
	npm i -g @openai/codex
fi

exec "$codex_bin" "$@"
