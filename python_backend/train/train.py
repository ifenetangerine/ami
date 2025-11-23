"""Train small classifiers on DeepFace embeddings.

Usage:
  python train.py --data-dir ../data --output model.joblib

This script:
 - Walks `data_dir` for subfolders (each subfolder -> label)
 - Uses DeepFace to extract 512-d ArcFace embeddings
 - Trains several small classifiers (LogReg, SVM, RandomForest, LightGBM if available, small MLP)
 - Evaluates on a holdout set and saves the best model to disk

Notes:
 - Keep training quick by using small models and default hyperparams.
 - Requires DeepFace, scikit-learn, joblib. LightGBM optional.
"""

import os
import argparse
import logging
from typing import List

import cv2
import numpy as np
from deepface import DeepFace

from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib

try:
    import lightgbm as lgb
    HAS_LGB = True
except Exception:
    HAS_LGB = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def collect_image_paths(data_dir: str) -> List[tuple]:
    entries = []
    for label in sorted(os.listdir(data_dir)):
        label_dir = os.path.join(data_dir, label)
        if not os.path.isdir(label_dir):
            continue
        for fn in os.listdir(label_dir):
            if fn.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.webp')):
                entries.append((os.path.join(label_dir, fn), label))
    return entries


def extract_embedding(img_path: str, model_name: str = 'ArcFace') -> np.ndarray:
    # Read image
    img = cv2.imread(img_path)
    if img is None:
        raise ValueError(f'Failed to read image: {img_path}')

    # Use DeepFace.represent to get embeddings (align and detect face internally)
    try:
        emb = DeepFace.represent(img_path = img_path, model_name=model_name, enforce_detection=False)
        # DeepFace.represent may return a list with a dict or a plain vector depending on version
        if isinstance(emb, dict) and 'embedding' in emb:
            vec = np.array(emb['embedding'], dtype=np.float32)
        elif isinstance(emb, list) and len(emb) > 0 and isinstance(emb[0], dict) and 'embedding' in emb[0]:
            vec = np.array(emb[0]['embedding'], dtype=np.float32)
        else:
            vec = np.array(emb, dtype=np.float32)
        return vec
    except Exception as e:
        logger.warning(f'Embedding extraction failed for {img_path}: {e}')
        raise


def build_dataset(data_dir: str, model_name: str = 'ArcFace'):
    items = collect_image_paths(data_dir)
    X = []
    y = []
    logger.info(f'Found {len(items)} images in {data_dir}')

    for i, (path, label) in enumerate(items):
        try:
            emb = extract_embedding(path, model_name=model_name)
            X.append(emb)
            y.append(label)
        except Exception:
            logger.debug(f'Skipping failed image: {path}')
        if (i + 1) % 50 == 0:
            logger.info(f'Processed {i+1}/{len(items)}')

    if len(X) == 0:
        raise RuntimeError('No embeddings extracted; check your data and DeepFace installation')

    X = np.vstack(X)
    y = np.array(y)
    return X, y


def train_and_evaluate(X, y, out_path: str):
    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(X, y_enc, test_size=0.2, random_state=42, stratify=y_enc)

    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_test = scaler.transform(X_test)

    models = {}

    # Logistic Regression (fast)
    models['logreg'] = LogisticRegression(max_iter=1000)

    # SVM (rbf)
    models['svm'] = SVC(kernel='rbf', probability=True)

    # Random Forest
    models['rf'] = RandomForestClassifier(n_estimators=100)

    # LightGBM if available
    if HAS_LGB:
        models['lgb'] = lgb.LGBMClassifier(n_estimators=100)

    # Small MLP
    models['mlp'] = MLPClassifier(hidden_layer_sizes=(128, 64), max_iter=300)

    results = {}
    for name, model in models.items():
        logger.info(f'Training {name}...')
        try:
            model.fit(X_train, y_train)
            preds = model.predict(X_test)
            acc = accuracy_score(y_test, preds)
            logger.info(f'{name} accuracy: {acc:.4f}')
            results[name] = (acc, model)
            print(f'--- {name} classification report ---')
            print(classification_report(y_test, preds, target_names=le.classes_))
        except Exception as e:
            logger.error(f'Failed training {name}: {e}')

    # Pick best by accuracy
    best_name = max(results.keys(), key=lambda k: results[k][0]) if results else None
    if best_name:
        best_acc, best_model = results[best_name]
        logger.info(f'Best model: {best_name} (acc={best_acc:.4f})')
        # Save pipeline: scaler + model + label encoder
        pipeline = {'scaler': scaler, 'model': best_model, 'label_encoder': le, 'model_name': best_name}
        joblib.dump(pipeline, out_path)
        logger.info(f'Saved best model pipeline to {out_path}')
    else:
        logger.error('No successful models to save')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data-dir', type=str, default=os.path.join(os.path.dirname(__file__), '..', 'data'))
    parser.add_argument('--output', type=str, default='best_model.joblib')
    parser.add_argument('--model', type=str, default='ArcFace', help='DeepFace model to use for embeddings (ArcFace recommended)')
    args = parser.parse_args()

    data_dir = os.path.abspath(args.data_dir)
    if not os.path.isdir(data_dir):
        raise SystemExit(f'Data dir does not exist: {data_dir}')

    X, y = build_dataset(data_dir, model_name=args.model)

    logger.info(f'Embedding matrix shape: {X.shape}')
    train_and_evaluate(X, y, args.output)


if __name__ == '__main__':
    main()
