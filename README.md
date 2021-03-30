# spikes-vis
Dataset visualization

## Setup

* First, clone the repository: `git clone https://github.com/kevinyu/spikes-vis.git`

* `cd spikes-vis`

The best way to run this is through a python virtual environment using python's virtualenv

* Create a virtual environment: `virtualenv env`

* Activate the environment with `source env/bin/activate`

* Install python dependencies (after activating the environment) with `pip install -r requirements.txt`

## Preparing data files

Visualizing a dataset of N datapoints with this tool requires the following files:

1. 2D scatter data of shape (N, 2)
2. ONE OR BOTH OF:
    a. Spectrogram data in the form of an array with shape (N, X, Y) where (X, Y) are the dimensions of the spectrogram images
    b. Waveform data in the form of an array with shape (N, Z) where Z is the duration of one waveform in samples

Optionally, you can also include

3. Labels data, a 1D array of shape (N,) where each element is an integer label indicating a classifier label / cluster name for each data point.

Save each data array as a `.npy` file (using `numpy.save(filename, arr)`) and put them somewhere on your file system. You will specify the paths to these files when running the `runserver.py` command below.

## Running the server

Make sure the virtual environment is active when running the server

```
python runserver.py --help
```
```
Usage: runserver.py [OPTIONS]

Options:
  --scatter PATH       npy file of (N_SAMPLES, 2) scatter data
  --spectrograms PATH  npy file of (N_SAMPLES, X, Y) spectrogram data
  --waveforms PATH     npy file of (N_SAMPLES, WF_SIZE) waveform data
  --labels PATH        npy file of len=N_SAMPLES integer label data
  --port INTEGER
  --debug BOOLEAN
  --help               Show this message and exit.
```

* Go to browser at `localhost:8080`

### Example:

```
python runserver.py \
    --scatter data/scatter.npy \
    --spectrograms data/spectrograms.npy \
    --waveforms data/waveforms.npy \
    --labels data/labels.npy \
    --port 8080
```
