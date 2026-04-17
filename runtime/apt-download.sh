#!/bin/sh
set -eu

packages_file=/tmp/apt-packages.txt
apt_state=/tmp/apt-state
apt_cache=/tmp/apt-cache

missing=0
while IFS= read -r package; do
	[ -z "$package" ] && continue
	if ! find /apt -maxdepth 1 -type f -name "${package}_*.deb" | grep -q .; then
		missing=1
		break
	fi
done < "$packages_file"

if [ "$missing" -eq 1 ]; then
	mkdir -p /apt/partial "$apt_state/lists/partial" "$apt_cache/archives/partial"
	apt_opts="
		-o Debug::NoLocking=1
		-o Dir::State=$apt_state
		-o Dir::State::lists=$apt_state/lists
		-o Dir::Cache=$apt_cache
		-o Dir::Cache::archives=/apt
	"
	# shellcheck disable=SC2086
	apt-get $apt_opts update
	# shellcheck disable=SC2086
	xargs apt-get $apt_opts install -y --download-only --no-install-recommends < "$packages_file"
fi

find /apt -maxdepth 1 -type f -name '*.deb' -printf '%f\n' | sort
