# spikes-vis
Dataset visualization

## Run the stuff

* Install python dependencies with `pip install -r requirements.txt`

* run server using `python runserver.py`

* Go to browser at `localhost:8080`

## Vocalizations

Data directory is `data/vocalizations/`

Create a directory with the name of the dataset you want to visualize

Within it, create two pickle files:

* `2d.pkl`: Containing a numpy array of $N_{datapoints}$ x 2 (2d projection for scatter-plot)

* `spectrograms.pkl`: Containing a list of length $N_{datapoints}$, each element of the list is a 2D array of dimensions $N_{frequency bins}$ x $N_{time points}$

## Spikes (doesnt work yet)

Data directory is `data/spikes/`

Create a directory with the name of the dataset you want to visualize

Within it, create two pickle files:

* `2d.pkl`: Containing a numpy array of $N_{datapoints}$ x 2 (2d projection for scatter-plot)

* `waveforms.pkl`: Containing a list of length $N_{datapoints}$, each element of the list is a 2D array of dimensions $N_{frequency bins}$ x $N_{time points}$


