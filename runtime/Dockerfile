# syntax=docker/dockerfile:1

FROM golang:1.26-alpine AS builder

WORKDIR /src/server

COPY server/go.mod server/go.sum ./
RUN go mod download

COPY server/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags='-s -w' -o /out/multica ./cmd/multica

FROM ubuntu:24.04

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates bash git openssh-client curl \
	&& rm -rf /var/lib/apt/lists/* \
	&& update-ca-certificates

WORKDIR /work

COPY --from=builder /out/multica /usr/local/bin/multica

# Daemon local health endpoint.
EXPOSE 19514

ENTRYPOINT ["/bin/bash"]
