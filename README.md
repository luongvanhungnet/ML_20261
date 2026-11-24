# Machine Learning for Cybersecurity

ML 2026.1 coursework on classifying network traffic records, predicting anomaly scores, and grouping traffic by shared features. The repository includes training notebooks, reproducible experiment scripts, and a dashboard for exploring traffic and reviewing model predictions.

## Project layout

| Component | What it covers |
| --- | --- |
| [Logistic Regression](Logistic_Regression/Logistic_Regression_Cybersecurity.ipynb) | A linear baseline for attack-type classification. |
| [Decision Tree](Decision_Tree/decision_tree_cybersecurity.ipynb) | Attack-type classification with tree visualization and feature importance. |
| [ANN / MLP](ANN/DONG_MLP_Colab.ipynb) | Training and evaluating multilayer perceptron classifiers in Google Colab. |
| [Naive Bayes and SVM](Naive_Bayes_SVM/run_all.ipynb) | Comparing Gaussian and Categorical Naive Bayes with linear and RBF SVMs on two datasets. |
| [KNN, K-means, and the dashboard](KNN_Kmeans/README.md) | Coursework experiments and a React/FastAPI app for traffic exploration, predictions, and alert triage. |

## Datasets

Dataset files are ignored by Git. Download the data and place each copy where the component expects it. The Incribo CSV contains 40,000 synthetic records. The Naive Bayes and SVM experiments also use a subset of labeled network flows from CIC-IDS2017. [Incribo dataset](https://github.com/incribo-inc/cybersecurity_attacks) · [CIC-IDS2017 dataset](https://www.unb.ca/cic/datasets/ids-2017.html)

| Component | Dataset location |
| --- | --- |
| Logistic Regression | `Logistic_Regression/archive/cybersecurity_attacks.csv` |
| Decision Tree | `Decision_Tree/data/cybersecurity_attacks.csv` |
| ANN / MLP | Upload `cybersecurity_attacks.csv` when the Colab notebook prompts you. |
| KNN, K-means, and dashboard | `KNN_Kmeans/dataset/cybersecurity_attacks.csv` |
| Naive Bayes and SVM | The runner downloads missing files into `Naive_Bayes_SVM/data/`. For an offline run, put the Incribo CSV in `data/incribo/` and the four flow CSVs listed in the loader in `data/cicids2017/`, relative to `Naive_Bayes_SVM/`. [Dataset loader](Naive_Bayes_SVM/dong_data.py) |

## Run the experiments

### Logistic Regression, Decision Tree, and MLP

Install the notebook dependencies in your Python environment.

```sh
python -m pip install jupyterlab numpy pandas scikit-learn matplotlib seaborn joblib
```

For Logistic Regression and Decision Tree, start JupyterLab from the corresponding component directory, open its notebook, and run the cells in order. For the MLP, open its notebook in Google Colab and upload the CSV.

### Naive Bayes and SVM

The runner and notebook currently stop with `ModuleNotFoundError: No module named 'algorithms'`. They require `algorithms.naive_bayes.models` and `algorithms.svm.models`, which are missing from this checkout. The [saved experiment results](Naive_Bayes_SVM/results/20261123-135345-887144/results.csv) are available to inspect.

Once the model modules are available, install the pinned dependencies in a dedicated Python environment and run the following from the repository root.

```sh
python -m pip install -r Naive_Bayes_SVM/requirements.txt
python Naive_Bayes_SVM/run_experiment.py --dataset incribo
```

Use `--dataset cicids2017` for CIC-IDS2017, `--dataset all` for both datasets, or `--local-data` to use files already on disk. Each run writes a timestamped directory under `Naive_Bayes_SVM/results/` with a `results.csv` summary and per-model metrics. The experiment notebook also displays confusion matrices and per-class scores.

### KNN, K-means, and other coursework models

From the repository root, run the offline experiments with the Incribo CSV in place.

```sh
cd KNN_Kmeans
python -m pip install -r ml/requirements.txt
python ml/src/course_experiments.py
```

The runner evaluates attack-type classification, anomaly-score regression, and traffic clustering. See the [training report](KNN_Kmeans/docs/ml_training_report.txt) and [experiment setup](KNN_Kmeans/ml/README.md) for metrics, data splits, and output locations.

## Run the dashboard

With Docker Compose installed, run the following from the repository root after placing the CSV in `KNN_Kmeans/dataset/`. The backend imports up to 10,000 rows at startup when the traffic table is empty.

```sh
cd KNN_Kmeans
docker compose up --build
```

Open [the dashboard](http://localhost) or [the FastAPI documentation](http://localhost:8000/docs). See the [dashboard setup guide](KNN_Kmeans/README.md) for demo accounts and setup without Docker.
