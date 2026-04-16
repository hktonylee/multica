# syntax=docker/dockerfile:1

FROM golang:1.26-alpine AS builder

WORKDIR /src/server

COPY server/go.mod server/go.sum ./
RUN go mod download

COPY server/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags='-s -w' -o /out/multica ./cmd/multica

FROM alpine:3.22

RUN apk add --no-cache ca-certificates bash git openssh-client curl && update-ca-certificates

WORKDIR /work

COPY --from=builder /out/multica /usr/local/bin/multica

# Daemon local health endpoint.
EXPOSE 19514

ENTRYPOINT ["/usr/local/bin/multica"]
CMD ["daemon", "start", "--foreground"]
