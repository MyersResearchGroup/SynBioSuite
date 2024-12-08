# XDC_Server
A Python Flask server that converts Excel files into SBOL and uploads it into SBH and FJ

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
