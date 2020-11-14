# spikes-vis
Dataset visualization

## Setup

* First, clone the repository: `git clone https://github.com/kevinyu/spikes-vis.git`

* `cd spikes-vis`

The best way to run this is through a python virtual environment using python's virtualenv

* Create a virtual environment: `virtualenv env`

* Activate the environment with `source env/bin/activate`

* Install python dependencies (after activating the environment) with `pip install -r requirements.txt`

## Running the server

Make sure the virtual environment is active when running the server

* `python runserver.py`

* Go to browser at `localhost:8080`

## Vocalizations

Data directory is `data/vocalizations/`

To visualize a vocalizations dataset (2d projection + spectrograms), create a directory with the name of the dataset you want to visualize in the data directory

For example, `mkdir data/vocalizations/LbY6074__161215_145633`

Within it, add the following two pickle files:

* `2d.pkl`: Containing a numpy array of N x 2 (2d projection for scatter-plot), where N is the number of datapoints. The dtype must be float64!

* `spectrograms.pkl`: Containing a list of length N, where each element of the list is a 2D array of dimensions F x T where F is the number of frequency channels and T is the number of time steps of the spectrogram

* View them at `http://localhost:8080/#!/spectrogram` and select your new dataset from the dropdown

## Spikes (doesnt work yet)

Data directory is `data/spikes/`

Create two pickle files:

* `2d.pkl`: Containing a numpy array of N x 2 (2d projection for scatter-plot)

* `waveforms.pkl`: Containing a numpy array of N x T, where N is the number of data points and T is the length of a waveform
