#!/usr/bin/env bash
set -euo pipefail

BOOTSTRAP="${KAFKA_BROKERS:-kafka:9092}"

create_topic() {
  local topic="$1"
  local partitions="$2"
  kafka-topics --bootstrap-server "$BOOTSTRAP" --create --if-not-exists --topic "$topic" --partitions "$partitions" --replication-factor 1
}

create_topic neuralmesh.metrics.raw 12
create_topic neuralmesh.anomaly.detected 4
create_topic neuralmesh.healing.started 4
create_topic neuralmesh.healing.complete 4
create_topic neuralmesh.healing.failed 4
create_topic neuralmesh.scale.event 4
create_topic neuralmesh.service.health 4
create_topic neuralmesh.service.down 4
create_topic neuralmesh.notification.sent 4
create_topic neuralmesh.chaos.started 2
create_topic neuralmesh.chaos.completed 2
create_topic neuralmesh.audit 1

echo "NeuralMesh Kafka topics are ready."

