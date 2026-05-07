from pathlib import Path

import joblib

from src.anomaly import AnomalyDetector


def main() -> None:
    output_dir = Path(__file__).resolve().parents[1] / "models"
    output_dir.mkdir(exist_ok=True)
    detector = AnomalyDetector()
    joblib.dump(detector.model, output_dir / "isolation_forest.joblib")
    (output_dir / "sequence_detector.metadata.json").write_text(
        '{"model":"sequence_detector","type":"lstm-compatible-statistical-sequence","version":"1.0.0"}',
        encoding="utf-8",
    )
    print(f"Saved model artifacts to {output_dir}")


if __name__ == "__main__":
    main()

