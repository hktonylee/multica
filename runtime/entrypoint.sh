#!/bin/sh
set -eu

marker=/var/lib/multica-runtime/apt-installed

install_matching() {
	for pattern in "$@"; do
		for deb in /apt/$pattern; do
			[ -e "$deb" ] || continue
			DEBIAN_FRONTEND=noninteractive dpkg -i "$deb"
		done
	done
}

if [ ! -f "$marker" ] && ls /apt/*.deb >/dev/null 2>&1; then
	mkdir -p "$(dirname "$marker")"
	install_matching 'libpython3.*-minimal_*.deb' 'python3.*-minimal_*.deb' 'python3-minimal_*.deb'
	DEBIAN_FRONTEND=noninteractive dpkg -i /apt/*.deb || DEBIAN_FRONTEND=noninteractive dpkg --configure -a
	DEBIAN_FRONTEND=noninteractive dpkg --configure -a
	touch "$marker"
fi

runtime_user="${RUNTIME_USER:-ubuntu}"
runtime_home="$(getent passwd "$runtime_user" | cut -d: -f6)"

mkdir -p "$runtime_home/.multica" "$runtime_home/.codex" /usr/local/lib/node_modules /work
chown -R "$runtime_user:$runtime_user" "$runtime_home/.multica" "$runtime_home/.codex" /usr/local/lib/node_modules /work

exec gosu "$runtime_user" /bin/bash "$@"
