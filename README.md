![readme-pic](https://user-images.githubusercontent.com/11147616/196558743-5a5e2c03-0731-4f56-aca4-5430a56c7e8a.png)

# SynBioSuite

A web app for the design and analysis of genetic circuits. This repository is just the SPA, and doesn't include SBOLCanvas or the iBioSim API. See _Environment Variables_ in the frontend section below.

## Public Instance

A version of SynBioSuite is available at https://synbiosuite.org.

# Frontend

## Run Locally

Clone the project

```bash
git clone https://github.com/MyersResearchGroup/SynBio-Suite
```

Go to the project directory

```bash
cd SynBio-Suite
```

Install dependencies

```bash
npm install
```

Add .env file (see _Environment Variables_ section below).

Start the development server

```bash
npm run dev
```

## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

`VITE_IBIOSIM_API`
The endpoint for the iBioSim API. The application expects it to be behind an instance of the [iBioSim API Connector](https://github.com/zachsents/iBioSim-API-Connector). A public instance is available here: `https://ibiosimconnector-api.azurewebsites.net/api/orchestrators/analyze`

`VITE_SBOL_CANVAS_URL`
An instance of [SBOLCanvas](https://github.com/SynBioDex/SBOLCanvas/tree/synbio-suite). A public one is available here: `https://sbolcanvas.org`

## Deployment

This project uses Vite for building. To build, run:

```bash
npm run build
```

The built files will be in the `dist` directory.

# Backend

## SynBioSuite_Server

A Python Flask server that converts Excel files into SBOL and uploads it into SBH and FJ

## Current Usage (2/5/25)

### WARNING:

May have to edit dockerfile line 2 to clarify the platform on which you are running. (--platform=...)

Currently in a template-based design.

Go to main directory:

```bash
cd SynBioSuite_Server
```

Build the image:

```bash
docker build -t sbs_server .
```

Run the image:

```bash
docker run -p 5003:5003 sbs_server
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
