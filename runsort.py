import cPickle as pickle
import os
import glob
import sys

import numpy as np
from flask import Flask, render_template, jsonify, request

import config
from api import utils

from sklearn.cluster import KMeans


app = Flask(__name__, static_folder="static", template_folder="templates")
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config["DATASERVER"] = config.DATASERVER


def create_server(
        waveforms_file,
        tsne_file,
        output_file
        ):
    waveforms = np.load(waveforms_file)[()]
    xy_data = np.load(tsne_file)[()]

    @app.route("/")
    def index():
        return render_template("sort.html")

    @app.route("/datasets/waveforms")
    def get_waveforms():
        return jsonify([{
            "idx": i,
            "waveform": list(row)
        } for i, row in enumerate(waveforms)])

    @app.route("/save", methods=["POST"])
    def save_data():
        data = request.get_json(silent=True)
        np.save(output_file, {
            "model": kmeans,
            "units": data["units"]
        })
        return jsonify({'result': 'success'})

    @app.route("/datasets/spikes/<int:k>")
    def do_kmeans(k=1):
        if k == 1:
            labels = np.zeros(len(waveforms))
        else:
            global kmeans
            kmeans = KMeans(n_clusters=k)
            kmeans.fit(waveforms)
            labels = kmeans.predict(waveforms).astype(np.int64)
        return jsonify([
            {"idx": i, "x": x, "y": y, "cluster": label}
            for i, ((x, y), label) in enumerate(zip(xy_data, labels))
        ])


    return app


if __name__ == "__main__":
    app = create_server(sys.argv[1], sys.argv[2])
    app.run(host="0.0.0.0", port=8111, debug=True)
