# Machine learning coursework experiments

From the project root:

```powershell
python -m pip install -r ml/requirements.txt
python ml/src/course_experiments.py
```

The runner uses `datasheet/cybersecurity_attacks.csv` when present, otherwise
`dataset/cybersecurity_attacks.csv`. Pass `--data path/to/file.csv` to override it;
the CSV must have the same feature and target columns as the project dataset.

It runs preprocessing, L3 regression, L4-5 KMeans clustering, L6 logistic
classification, L7 KNN, L8 decision tree and random forest, L9 Gaussian naive
Bayes, L10 multilayer perceptron, and L11 calibrated linear SVM. Majority-class and mean-score
baselines provide comparison. All supervised estimators train on 70% of usable
rows with shared 15% validation and 15% test partitions.

Outputs:

- `docs/ml_training_report.txt`: measured results, methods, interpretation, limitations.
- `ml/reports/course_experiments.json`: full metrics, parameters and software versions.
- `ml/artifacts/course/`: fitted preprocessing/model pipelines and split indices.

Classification predicts `Attack Type`; regression predicts `Anomaly Scores`.
Clustering uses the same seven traffic inputs without either target. The report
documents exclusions and preprocessing. Select supervised candidates using
validation macro-F1/RMSE and cluster count using validation silhouette.

These experiments are independent of the dashboard's existing model registry
and do not activate a serving model. The original `ml/src/train.py` baseline
runner and `ml/reports/evaluation_report.json` are retained separately.
