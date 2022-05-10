# Introduction

This project is an example web API backend server that is meant to be used as a backend service for those who wish to self-host the Estonian ASR system (https://github.com/taltechnlp/est-asr-pipeline) and offer its users a simple API to make transciption requests as well as provide real-time progress information about those requests.

This project is built to send transcription requests to the Estonian speech-to-text ASR service which should be deployed as a Docker container. It also retrieves events from the requests and stores a part of the information in its own database. This allows it to provide progress information about specific transcription request and also about all requests in general, enabling it to make predictions about the queue length and expected time of completion. As the queue length depends on the deployment of the ASR service (how many parallel executions are allowed, how long on average does it take to transcribe a minute of speech), all parameters that are used to make estimations are configurable.

The project depends on Deno and PostgreSQL which are required to be installed locally.

# Installation

## Deno

Install Deno locally as a single binary executable. It has no external dependencies.
Note! At the time of writing Deno version 1.16.0 is supported by Denon file watcher and should be preferred over the later versions!

Official installation guide: https://deno.land/manual/getting_started/installation
Version 1.16.0: https://github.com/denoland/deno/releases/tag/v1.16.0

## Denon

Denon is a file watcher which simplyfies running of the project by utilizing the scripts.json configuration file.
Note! At the time of writing Denon supports Deno version 1.16.0 and the installation fails with a later Deno version!
Official installation guide: https://github.com/denosaurs/denon

## PostgreSQL

Install PostgreSQL: e.g. https://www.tecmint.com/install-postgresql-and-pgadmin-in-ubuntu/

Create a user named postgres

```
sudo -i -u postgres
psql
\q
exit
```

Create a database calles results:

```
\c results
```

Create a scipts.json file to the root of the project. Set username and password values in the script.json file. An example file called scripts.json.example is provided.

# API Documentation

The server provides the following endpoints:

1. /upload
2. /progress

# Usage

The following starts the server based on the configuration provided in the file scripts.json.

```
denon start
```

An example request from the command line to consume the API:

```
curl -i -X POST -F "data=@audio.mp3" http://localhost:7700/upload
```
# Results

