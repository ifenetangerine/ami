#!/usr/bin/env python3
"""
Train three independent binary (one-vs-rest) classifiers using DeepFace embeddings.

Each classifier is trained to predict one label vs everything else. Labels used:
  - confusion
  - laughing
  - emptiness

Data layout (default): `python_backend/data/<label>/*.jpg`.

Saves a combined pipeline with a global `StandardScaler` and a dict of trained
LogisticRegression models to the specified output file (joblib).
"""
import os
import argparse
import logging
from typing import List, Dict

import cv2
import numpy as np
from deepface import DeepFace

from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)




def collect_images_for_label(data_dir: str, label: str) -> List[str]:
    """Return sorted image paths for a specific label folder."""
    label_dir = os.path.join(data_dir, label)
    if not os.path.isdir(label_dir):
        logger.warning(f'label dir missing: {label_dir} (skipping)')
        return []
    imgs = [os.path.join(label_dir, fn) for fn in sorted(os.listdir(label_dir))
            if fn.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.webp'))]
    return imgs


def extract_embedding(img_path: str, model_name: str = 'ArcFace') -> np.ndarray:
    img = cv2.imread(img_path)
    if img is None:
        raise ValueError(f'Failed to read image: {img_path}')
    try:
        emb = DeepFace.represent(img_path=img_path, model_name=model_name, enforce_detection=False)
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


# Note: we now extract embeddings per-path using `build_embeddings_for_paths` and
# build per-label datasets in `main()`; the older build_embedding_matrix is unused.


def build_embeddings_for_paths(paths: List[str], model_name: str = 'ArcFace') -> Dict[str, np.ndarray]:
    """Extract embeddings for a list of image paths and return a dict path->embedding.

    Skips images that fail to embed and logs a warning.
    """
    emb_map: Dict[str, np.ndarray] = {}
    for p in paths:
        try:
            vec = extract_embedding(p, model_name=model_name)
            emb_map[p] = vec
        except Exception as e:
            logger.warning(f'Failed to extract embedding for {p}: {e}')
    return emb_map


def train_single_binary(X: np.ndarray, y: np.ndarray, lbl: str, class_weight=None, calibrate: bool = False):
    """Train a single binary classifier for label `lbl` given features X and binary labels y.

    Returns the trained estimator. Prints metrics to logger/stdout similar to previous behavior.
    """
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42,
            stratify=y if len(np.unique(y)) > 1 else None
        )
    except Exception:
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    clf = LogisticRegression(max_iter=1000, class_weight=class_weight)
    try:
        clf.fit(X_train, y_train)
        if calibrate:
            try:
                clf = CalibratedClassifierCV(clf, cv=3)
                clf.fit(X_train, y_train)
            except Exception as e:
                logger.warning(f'Calibration failed for {lbl}: {e}')
        preds = clf.predict(X_test)
        acc = accuracy_score(y_test, preds) if len(np.unique(y_test)) > 1 else float('nan')
        logger.info(f'{lbl} accuracy: {acc}')
        if len(np.unique(y_test)) > 1:
            print(f'--- {lbl} classification report ---')
            print(classification_report(y_test, preds))
        return clf
    except Exception as e:
        logger.error(f'Failed to train classifier for {lbl}: {e}')
        return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data-dir', type=str, default=os.path.join(os.path.dirname(__file__), '..', '..', 'data'))
    parser.add_argument('--output', type=str, default=os.path.join(os.path.dirname(__file__), 'binary_ovr_pipeline.joblib'))
    parser.add_argument('--model', type=str, default='ArcFace')
    parser.add_argument('--class-weight', type=str, choices=['none', 'balanced'], default='none',
                        help='Class weight to use for LogisticRegression (use "balanced" to mitigate class imbalance)')
    parser.add_argument('--calibrate', action='store_true', help='Wrap classifiers with CalibratedClassifierCV to improve probability estimates')
    parser.add_argument('--neg-sample-size', type=int, default=20, help='Number of neutral images to sample and use as negatives for each classifier')
    args = parser.parse_args()

    labels = ['confusion', 'laughing', 'emptiness']
    data_dir = os.path.abspath(args.data_dir)
    logger.info(f'Looking for data in {data_dir} for labels: {labels}')

    # gather per-label image lists
    label_image_map: Dict[str, List[str]] = {lbl: collect_images_for_label(data_dir, lbl) for lbl in labels}

    # attempt to use a neutral folder as negatives
    neutral_imgs = collect_images_for_label(data_dir, 'neutral')
    neg_sample_size = int(getattr(args, 'neg_sample_size', 20))
    rng = np.random.default_rng(42)
    if neutral_imgs:
        if len(neutral_imgs) <= neg_sample_size:
            sampled_neutral = list(neutral_imgs)
        else:
            sampled_neutral = list(rng.choice(neutral_imgs, size=neg_sample_size, replace=False))
        logger.info(f'Using {len(sampled_neutral)} neutral images as negatives from {os.path.join(data_dir, "neutral")}')
    else:
        sampled_neutral = []
        logger.info('No neutral folder found or empty; falling back to using other label images as negatives')

    # Build a union of all image paths we will need embeddings for (positives + sampled neutral negatives)
    all_needed_paths = set()
    for lbl, imgs in label_image_map.items():
        for p in imgs:
            all_needed_paths.add(p)
    for p in sampled_neutral:
        all_needed_paths.add(p)

    if not all_needed_paths:
        raise RuntimeError('No images found for training; check data dir and labels')

    logger.info(f'Extracting embeddings for {len(all_needed_paths)} images (positives + sampled negatives)')
    emb_map = build_embeddings_for_paths(sorted(all_needed_paths), model_name=args.model)

    # Build global scaler on the embeddings we extracted
    X_all = np.vstack([emb_map[p] for p in sorted(emb_map.keys())])
    scaler = StandardScaler()
    X_all_scaled = scaler.fit_transform(X_all)

    # map path -> scaled embedding for quick lookup
    path_to_scaled = {p: X_all_scaled[i] for i, p in enumerate(sorted(emb_map.keys()))}

    # training options
    cw = args.class_weight if args.class_weight in ('balanced',) else None
    calibrate = args.calibrate

    # For each label, build X and y using positives and sampled neutral negatives (or other labels if neutral missing)
    models = {}
    for lbl in labels:
        pos_paths = label_image_map.get(lbl, [])
        # negatives = all images from other label folders + sampled neutral faces (if available)
        neg_paths = []
        for other_lbl, imgs in label_image_map.items():
            if other_lbl == lbl:
                continue
            neg_paths.extend(imgs)
        if sampled_neutral:
            neg_paths.extend(sampled_neutral)
        # deduplicate while preserving order
        seen = set()
        deduped_neg = []
        for p in neg_paths:
            if p not in seen:
                seen.add(p)
                deduped_neg.append(p)
        neg_paths = deduped_neg

        # filter out paths that failed embedding extraction
        pos_paths = [p for p in pos_paths if p in path_to_scaled]
        neg_paths = [p for p in neg_paths if p in path_to_scaled]

        if not pos_paths:
            logger.warning(f'No positive images found (or embeddings failed) for label {lbl}; skipping')
            continue

        X_pos = np.vstack([path_to_scaled[p] for p in pos_paths])
        X_neg = np.vstack([path_to_scaled[p] for p in neg_paths]) if neg_paths else np.empty((0, X_pos.shape[1]))

        X_lbl = np.vstack([X_pos, X_neg]) if X_neg.size else X_pos
        y_lbl = np.array([1] * len(X_pos) + [0] * len(X_neg)) if X_neg.size else np.array([1] * len(X_pos))

        # Train binary classifier for this label (positives + negatives already in X_lbl/y_lbl)
        logger.info(f'Training binary classifier for: {lbl} (pos={len(X_pos)} neg={len(X_neg)})')
        clf = train_single_binary(X_lbl, y_lbl, lbl, class_weight=cw, calibrate=calibrate)
        if clf is not None:
            models[lbl] = clf

    pipeline = {
        'scaler': scaler,
        'models': models,
        'labels': labels,
        'model_name': args.model
    }

    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    joblib.dump(pipeline, args.output)
    logger.info(f'Saved binary OVR pipeline to {args.output}')


if __name__ == '__main__':
    main()
