import pickle
import os
import glob

import numpy as np
from flask import Flask, render_template, jsonify

import config
from api import utils


app = Flask(__name__, static_folder="static", template_folder="templates")
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config["DATASERVER"] = config.DATASERVER


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/datasets/<category>")
def get_datasets(category):
    return jsonify(utils.get_datasets(category))


@app.route("/datasets/<category>/<dataset_name>/2D")
def get_2d_set(category, dataset_name):
    filename = utils.get_2d_file(category, dataset_name)
    data = utils.load_pkl_or_npy(filename)

    cluster_file = utils.get_cluster_file(category, dataset_name)
    print(cluster_file)
    if cluster_file:
        clusters = utils.load_pkl_or_npy(cluster_file)
    else:
        clusters = np.zeros(len(data))

    return jsonify([
        {"idx": i, "x": x, "y": y, "cluster": clust}
        for i, ((x, y), clust) in enumerate(zip(data, clusters))
    ])


_cache = {}
def preload_spectrograms(category, dataset_name):
    key = (category, dataset_name)
    if key in _cache:
        pass
    else:
        spec_file = utils.get_spectrogram_file(category, dataset_name)
        if not os.path.isfile(spec_file):
            return
        spec_data = utils.load_pkl_or_npy(spec_file)
        spec_data = utils.listify(spec_data)
        _cache[key] = spec_data

    return _cache[key]


@app.route("/datasets/<category>/<dataset_name>/spectrograms/load")
def trigger_preload(category, dataset_name):
    preload_spectrograms(category, dataset_name)
    return jsonify({"success": True})


@app.route("/datasets/<category>/<dataset_name>/spectrograms/<int:idx>")
def get_spectrogram(category, dataset_name, idx):
    dataset = preload_spectrograms(category, dataset_name)
    if not dataset:
        return jsonify({})
    return jsonify({
        "idx": idx,
        "spectrogram": dataset[idx]
    })


@app.route("/datasets/<category>/<dataset_name>/waveforms")
def get_waveforms(category, dataset_name):
    filename = utils.get_waveforms_file(category, dataset_name)
    dataset = utils.load_pkl_or_npy(filename)
    return jsonify([{
        "idx": i,
        "waveform": list(row)
    } for i, row in enumerate(dataset)])
    

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=config.PORT, debug=config.DEBUG)
