# Local mTLS Assets

Production service-to-service mTLS is represented by the Helm/Istio manifests. For local Docker Compose, traffic stays on the private Compose network and JWT/RBAC remain active at the gateway.

To generate development certificates:

```powershell
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 365 -out ca.crt -subj "/CN=neuralmesh-dev-ca"
```

Vault PKI should own certificate issuance and 24-hour rotation outside local demo mode.

