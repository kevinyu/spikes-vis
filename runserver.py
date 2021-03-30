import pickle
import os
import glob
import sys

import click
import numpy as np
from flask import Flask, render_template, jsonify

import config
from api import utils


app = Flask(__name__, static_folder="static", template_folder="templates")
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config["DATASERVER"] = config.DATASERVER


MODES = ["spectrograms", "waveforms"]
CACHED_DATA = {}


def store_data(key, value):
    CACHED_DATA[key] = value


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/data/scatter")
def get_2d_set():
    data = CACHED_DATA.get("scatter")

    if data is None:
        return jsonify({"error": "No data"})

    if "labels" in CACHED_DATA:
        labels = CACHED_DATA["labels"]
    else:
        labels = [int(x) for x in range(len(data))]

    result =  jsonify([
        {"idx": i, "x": x, "y": y, "cluster": label}
        for i, ((x, y), label) in enumerate(zip(data, labels))
    ])

    return result


@app.route("/data/spectrograms/<int:idx>")
def get_spectrogram(idx):
    dataset = CACHED_DATA.get("spectrograms")

    if dataset is None:
        return jsonify({"error": "No spectrograms loaded"})
    return jsonify({
        "idx": idx,
        "spectrogram": dataset[idx]
    })


@app.route("/data/waveforms")
def get_waveforms():
    dataset = CACHED_DATA.get("waveforms")
    return jsonify([{
        "idx": i,
        "waveform": list(row)
    } for i, row in enumerate(dataset)])


@click.command()
@click.option("--scatter", type=click.Path(exists=True), help="npy file of (N_SAMPLES, 2) scatter data")
@click.option("--spectrograms", required=False, type=click.Path(exists=True), help="npy file of (N_SAMPLES, X, Y) spectrogram data")
@click.option("--waveforms", required=False, type=click.Path(exists=True), help="npy file of (N_SAMPLES, WF_SIZE) waveform data")
@click.option("--labels", required=False, type=click.Path(exists=True), help="npy file of len=N_SAMPLES integer label data")
@click.option("--port", default=config.PORT, type=int)
@click.option("--debug", default=config.DEBUG, type=bool)
def runserver(scatter, spectrograms, waveforms, labels, port, debug):
    if not (waveforms or spectrograms):
        click.echo("Either --waveforms or --spectrograms file must be specified")
        sys.exit(1)

    scatter_data = np.load(scatter)[()]
    if spectrograms:
        spectrogram_data = np.load(spectrograms)[()]
    if waveforms:
        waveform_data = np.load(waveforms)[()]
    if labels:
        label_data = np.load(labels)[()]
    
    store_data("scatter", scatter_data)
    if spectrograms:
        store_data("spectrograms", utils.listify(spectrogram_data))
    if waveforms:
        store_data("waveforms", waveform_data)
    if labels:
        store_data("labels", [int(x) for x in label_data])

    app.run(host="0.0.0.0", port=port, debug=debug)
    

if __name__ == "__main__":
    # import sys
    # Read in the scatter data and the visualization data from arguments
    runserver()
