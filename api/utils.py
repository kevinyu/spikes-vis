# File reading utils

import glob
import os

import numpy as np

import config


def _listify(d):
    spec_min = np.min(d)
    spec_max = np.max(d)
    data_range = spec_max - spec_min
    return np.rint(100.0 * (d - spec_min) / data_range).tolist()


def listify(data):
    return [_listify(d) for d in data]


def get_datasets(category="vocalizations"):
    return os.listdir(os.path.join(config.DATADIR, category))


def get_spectrogram_file(category, dataset_name):
    return os.path.join(
            config.DATADIR,
            category,
            dataset_name,
            "spectrograms.pkl")


def get_2d_file(category, dataset_name):
    return os.path.join(
                config.DATADIR,
                category,
                dataset_name,
                "2d.pkl")

