# Deployment

## Local

```powershell
Copy-Item .env.example .env
docker compose up --build
```

## Kubernetes

```powershell
helm lint .\helm\neuralmesh
helm template neuralmesh .\helm\neuralmesh
helm upgrade --install neuralmesh .\helm\neuralmesh --namespace neuralmesh --create-namespace
```

The chart includes deployments, services, HPA, NetworkPolicy, RBAC service account, ConfigMap, Secret placeholders, Ingress, and optional Istio mTLS.

## Secrets

Local Compose uses generated development JWT keys and permissive service networking. Production should use Vault Agent sidecars:

- JWT private/public keys in Vault KV or Transit.
- Vault PKI for 24-hour internal service certificates.
- Dynamic PostgreSQL credentials with short TTL.
- Kafka SASL credentials generated and rotated by Vault.

