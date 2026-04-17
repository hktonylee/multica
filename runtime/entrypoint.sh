#!/bin/sh
set -eu

marker=/var/lib/multica-runtime/apt-installed

if [ ! -f "$marker" ] && ls /apt/*.deb >/dev/null 2>&1; then
	mkdir -p "$(dirname "$marker")"
	DEBIAN_FRONTEND=noninteractive dpkg -i /apt/*.deb
	touch "$marker"
fi

runtime_user="${RUNTIME_USER:-ubuntu}"
runtime_home="$(getent passwd "$runtime_user" | cut -d: -f6)"

mkdir -p "$runtime_home/.multica" "$runtime_home/.codex" /work
chown -R "$runtime_user:$runtime_user" "$runtime_home/.multica" "$runtime_home/.codex" /work

exec gosu "$runtime_user" /bin/bash "$@"
