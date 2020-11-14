# File reading utils
import pickle

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


def pkl_or_npy(filename):
    basename, ext = os.path.splitext(filename)
    return [basename + ".pkl", basename + ".npy"]


def get_datasets(category="vocalizations"):
    return os.listdir(os.path.join(config.DATADIR, category))


def get_spectrogram_file(category, dataset_name):
    return os.path.join(
            config.DATADIR,
            category,
            dataset_name,
            "spectrograms.pkl")


def get_waveforms_file(category, dataset_name):
    files = pkl_or_npy(os.path.join(
            config.DATADIR,
            category,
            dataset_name,
            "waveforms.npy"))
    for f in files:
        if os.path.exists(f):
            return f


def get_2d_file(category, dataset_name):
    files = pkl_or_npy(os.path.join(
                config.DATADIR,
                category,
                dataset_name,
                "2d.pkl"))
    for f in files:
        if os.path.exists(f):
            return f


def get_cluster_file(category, dataset_name):
    files = pkl_or_npy(os.path.join(
                config.DATADIR,
                category,
                dataset_name,
                "clusters.pkl"))
    for f in files:
        if os.path.exists(f):
            return f


def get_cluster_flie(category, dataset_name):
    files = pkl_or_npy(os.path.join(
                config.DATADIR,
                category,
                dataset_name,
                "clusters.pkl"))
    for f in files:
        if os.path.exists(f):
            return f


def load_pkl_or_npy(filename):
    if isinstance(filename, str):
        filenames = [filename]
    else:
        filenames = filename

    for filename in filenames:
        if os.path.exists(filename):
            if os.path.splitext(filename)[1] == ".pkl":
                with open(filename, "rb") as datafile:
                    data = pickle.load(datafile)
            elif os.path.splitext(filename)[1] == ".npy":
                data = np.load(filename)

            return data
