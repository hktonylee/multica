# Kubernetes deployment (starter)

This folder contains baseline Kubernetes manifests for self-hosting Multica.

## Included resources

- Namespace: `multica`
- PostgreSQL 17 + pgvector deployment and service
- Backend deployment/service (Go API + WebSocket)
- Frontend deployment/service (Next.js app)
- Ingress for `app.example.com` and `api.example.com`
- Example ConfigMap + Secrets manifest

## 1) Build and publish images

Update image names/tags in:

- `backend.yaml` (`ghcr.io/multica-ai/multica-backend:latest`)
- `frontend.yaml` (`ghcr.io/multica-ai/multica-frontend:latest`)

Recommended: pin immutable tags (e.g. git SHA), not `latest`.

## 2) Configure domains and secrets

1. Copy `config-and-secrets.example.yaml` to your own file (e.g. `config-and-secrets.yaml`).
2. Set:
   - `FRONTEND_ORIGIN` and `CORS_ALLOWED_ORIGINS` to your app domain.
   - `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` to your API domain.
   - `DATABASE_URL`, `JWT_SECRET`, and any optional keys (Resend, OAuth, S3).

> Keep real secrets out of git.

## 3) Apply manifests

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/config-and-secrets.yaml
kubectl apply -f k8s/postgres-pvc.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
```

## 4) Validate

```bash
kubectl -n multica get pods
kubectl -n multica get svc
kubectl -n multica get ingress
kubectl -n multica logs deploy/multica-backend --tail=100
```

Health endpoint:

```bash
curl -i https://api.example.com/health
```

Expected body:

```json
{"status":"ok"}
```

## Notes

- Backend container runs DB migrations at startup.
- In production, managed PostgreSQL is recommended over in-cluster Postgres.
- If you use cert-manager, replace the static `tls.secretName` workflow accordingly.
