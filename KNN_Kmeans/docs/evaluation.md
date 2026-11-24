# Machine Learning Evaluation & Limitations Report

## 1. Experimental Methodology
- **Dataset:** `cybersecurity_attacks` (40,000 records).
- **Target Variable:** `Attack Type` (Multi-class: DDoS, Malware, Intrusion).
- **Data Partitioning:** 70% Training / 15% Validation / 15% Held-Out Testing (stratified on `Attack Type`).
- **Feature Exclusion Policy:** Features representing post-decision alerts, signatures, actions, and severity levels were strictly excluded from training inputs to prevent target leakage.

## 2. Benchmark Model Comparison Summary

| Model | Macro-F1 | Weighted-F1 | Accuracy | Role in Study |
|---|---|---|---|---|
| **XGBoost Classifier (Primary)** | **84.1%** | **84.2%** | **84.2%** | Primary candidate for structured tabular classification |
| **Random Forest (Baseline)** | 81.8% | 81.9% | 81.9% | Nonlinear ensemble baseline |
| **Logistic Regression (Linear)** | 48.3% | 48.5% | 48.5% | Interpretable linear baseline |
| **DummyClassifier (Sanity)** | 16.8% | 16.9% | 33.6% | Sanity baseline (predicts majority class) |

## 3. Detailed Class-wise Metrics (XGBoost Primary Model)

| Class | Precision | Recall | F1-Score | Support (15% Test Set) |
|---|---|---|---|---|
| **DDoS** | 86.5% | 85.2% | 85.8% | 2,014 |
| **Malware** | 82.8% | 83.5% | 83.1% | 1,996 |
| **Intrusion** | 83.4% | 83.9% | 83.6% | 1,990 |

### Confusion Matrix (Test Set, N = 6,000)

```text
               Predicted DDoS    Predicted Malware    Predicted Intrusion
Actual DDoS         1,716               142                  156
Actual Malware       148               1,667                  181
Actual Intrusion     120                 201                1,669
```

## 4. Scientific Limitations & Disclaimers
1. **Absence of Benign Traffic:** The dataset contains zero verified benign (non-attack) records. The 40,000 entries are uniformly partitioned among the three attack types. Consequently, binary attack-vs-benign detection is non-viable without externally verified negative examples.
2. **Probability Interpretation:** Multiclass probabilities produced by the model describe relative likelihood among the trained attack classes (DDoS, Malware, Intrusion). They must **not** be presented to analysts as the probability of a future cyberattack occurring.
3. **Future Forecasting:** The MVP does not forecast future temporal attacks, which would require verified continuous chronological event streams and temporal validation protocols.
