# Demo Guide

1. Start the platform.

```powershell
docker compose up --build
```

2. Open the dashboard at `http://localhost:5173`.

3. Run the scripted demo.

```powershell
.\scripts\demo.ps1
```

4. In the dashboard, select `data-service`, trigger `Pod Kill`, and watch the anomaly/healing/scaling tabs.

5. Mention these design points:

- Kafka keeps events durable when notification delivery is offline.
- Circuit breakers prevent cascading failures.
- Isolation Forest handles sudden anomalies; the sequence detector catches slower drift.
- Helm and NetworkPolicy show the production deployment shape.
- Vault and Istio are configured as production hardening paths.

