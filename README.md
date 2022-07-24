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

## PostgreSQL

Install PostgreSQL. Either locally e.g. https://www.tecmint.com/install-postgresql-and-pgadmin-in-ubuntu/ or using the provided docker-compose.yml.
The command to spin up the Docker container is (requires Docker to be installed first):
```
docker-compose up -d
``` 

Create a user named postgres

```
sudo -i -u postgres
psql
```

Create a database calles results:

```
createdb results
\q
exit
```

Finally preform a database migration to create the initial schema.

```
deno run --allow-net --allow-env --allow-run --allow-read initDb.ts
```

## Environment variables

Create a .env file to the root of the project. Add environment variables using the .env.example as a reference. The variables in the file .env.defaults can also be overridden in the .env file. Unless all variables defined in .env.example are defined in either .env or .env.defaults, the program will return a MissingEnvVarsError. 

# API Documentation

The server provides the following endpoints:

1. /upload
2. /progress

# Usage

The following starts the server with all the required privileges.

```
deno run --watch --allow-net --allow-env --allow-read --allow-write --allow-run app.ts
```

An example request from the command line to consume the API:

```
curl -i -X POST -F "data=@audio.mp3" http://localhost:7700/upload
```
# Results

