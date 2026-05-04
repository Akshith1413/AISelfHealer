import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 50 },
    { duration: "1m", target: 200 },
    { duration: "30s", target: 0 }
  ],
  thresholds: {
    http_req_duration: ["p(99)<2000"],
    http_req_failed: ["rate<0.05"]
  }
};

export default function () {
  const response = http.get("http://localhost:8080/api/v1/dashboard/snapshot");
  check(response, {
    "snapshot ok": (res) => res.status === 200,
    "has services": (res) => res.json("services").length >= 8
  });
  sleep(1);
}

