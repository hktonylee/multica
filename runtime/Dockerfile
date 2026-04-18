# syntax=docker/dockerfile:1

FROM golang:1.26-alpine AS builder

WORKDIR /src/server

COPY server/go.mod server/go.sum ./
RUN go mod download

COPY server/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags='-s -w' -o /out/multica ./cmd/multica

FROM ubuntu:24.04

ARG RUNTIME_UID=1000
ARG RUNTIME_GID=1000
ARG RUNTIME_USER=ubuntu
ARG KUBECTL_VERSION=v1.34.1
ARG TARGETARCH

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates bash git openssh-client curl gosu \
	&& rm -rf /var/lib/apt/lists/* \
	&& update-ca-certificates

RUN set -eu; \
	arch="${TARGETARCH:-amd64}"; \
	case "$arch" in \
		amd64|arm64) ;; \
		*) echo "Unsupported kubectl architecture: $arch" >&2; exit 1 ;; \
	esac; \
	curl -fsSLo /usr/local/bin/kubectl "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${arch}/kubectl"; \
	curl -fsSLo /tmp/kubectl.sha256 "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${arch}/kubectl.sha256"; \
	echo "$(cat /tmp/kubectl.sha256)  /usr/local/bin/kubectl" | sha256sum -c -; \
	chmod +x /usr/local/bin/kubectl; \
	rm -f /tmp/kubectl.sha256

RUN if getent group "${RUNTIME_USER}" >/dev/null; then \
		groupmod --gid "${RUNTIME_GID}" "${RUNTIME_USER}"; \
	else \
		groupadd --gid "${RUNTIME_GID}" "${RUNTIME_USER}"; \
	fi \
	&& if id -u "${RUNTIME_USER}" >/dev/null 2>&1; then \
		usermod --uid "${RUNTIME_UID}" --gid "${RUNTIME_GID}" --home "/home/${RUNTIME_USER}" --shell /bin/bash "${RUNTIME_USER}"; \
	else \
		useradd --uid "${RUNTIME_UID}" --gid "${RUNTIME_GID}" --create-home --shell /bin/bash "${RUNTIME_USER}"; \
	fi \
	&& mkdir -p "/home/${RUNTIME_USER}" \
	&& chown -R "${RUNTIME_UID}:${RUNTIME_GID}" "/home/${RUNTIME_USER}"

WORKDIR /work

COPY --from=builder /out/multica /usr/local/bin/multica
COPY runtime/entrypoint.sh /usr/local/bin/runtime-entrypoint
RUN chmod +x /usr/local/bin/runtime-entrypoint \
	&& chown "${RUNTIME_UID}:${RUNTIME_GID}" /work

# Daemon local health endpoint.
EXPOSE 19514

ENTRYPOINT ["/usr/local/bin/runtime-entrypoint"]
