#!/bin/sh
set -eu

packages_file=/tmp/apt-packages.txt
apt_state=/tmp/apt-state
apt_cache=/tmp/apt-cache
missing_packages=/tmp/apt-missing-packages.txt

: > "$missing_packages"
while IFS= read -r package; do
	[ -z "$package" ] && continue
	case "$package" in
		\#*) continue ;;
	esac
	if ! find /apt -maxdepth 1 -type f -name "${package}_*.deb" | grep -q .; then
		printf '%s\n' "$package" >> "$missing_packages"
	fi
done < "$packages_file"

if [ -s "$missing_packages" ]; then
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
	xargs apt-get $apt_opts install -y --download-only --no-install-recommends < "$missing_packages"
fi

find /apt -maxdepth 1 -type f -name '*.deb' -printf '%f\n' | sort
