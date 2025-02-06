# XDC_Server
A Python Flask server that converts Excel files into SBOL and uploads it into SBH and FJ

# Current Usage (2/5/25)

### WARNING: 

May have to edit dockerfile line 2 to clarify the platform on which you are running. (--platform=...)

Currently in a template-based design. 

Go to main directory:
```bash
cd SynBioSuite_Server
``` 

Build the image:
```bash
docker build -t xdc_server .
```

Run the image:
```bash
docker run xdc_server
```

The server will be running on localhost:5003

## Installation

This package requires Python 3.9.20 (other version create dependency issues). Use the package manager pip to install excel2sbol, excel2flapjack, flask, and flask-cors.

```bash
pip install excel2sbol
```

```bash
pip install excel2flapjack
```
```bash
pip install flask
```
```bash
pip install flask-cors
```

## Usage

In your command line, you can start up the server using the following command
```bash
flask --app views.py run
```
