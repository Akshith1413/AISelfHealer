import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_event_contract_declares_core_topics():
    contract = json.loads((ROOT / "contracts" / "events.json").read_text(encoding="utf-8"))
    event_types = set(contract["properties"]["event_type"]["enum"])
    assert {"anomaly.detected", "healing.started", "healing.complete", "scale.event", "service.down"} <= event_types


def test_documentation_source_is_preserved():
    source = ROOT / "docs" / "source-documentation.md"
    assert source.exists()
    text = source.read_text(encoding="utf-8")
    assert "NeuralMesh" in text
    assert "Chaos Engineering Module" in text

