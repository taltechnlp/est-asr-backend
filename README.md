# Introduction

This project is an example web API backend server that is meant to be used as a backend service for those who wish to self-host the Estonian ASR system (https://github.com/taltechnlp/est-asr-pipeline) and offer its users a simple API to make transciption requests as well as provide real-time progress information about those requests.

This project is built to send transcription requests to the Estonian speech-to-text ASR service which should be deployed as a Docker container. It also retrieves events from the requests and stores a part of the information in its own database. This allows it to provide progress information about specific transcription request and also about all requests in general, enabling it to make predictions about the queue length and expected time of completion. As the queue length depends on the deployment of the ASR service (how many parallel executions are allowed, how long on average does it take to transcribe a minute of speech), all parameters that are used to make estimations are configurable.

The project depends on Deno and SQLite.

# Installation

## Deno

Install Deno locally as a single binary executable. It has no external dependencies.
Note! At the time of writing Deno version 1.16.0 is supported by Denon file watcher and should be preferred over the later versions!

Official installation guide: https://deno.land/manual/getting_started/installation
Version 1.16.0: https://github.com/denoland/deno/releases/tag/v1.16.0

## SQLite

The project uses SQLite as its database. The database file will be created automatically in the root of the project.

To create the initial schema, run the following command:

```
deno run --allow-net --allow-env --allow-run --allow-read --allow-ffi initDb.ts
```

## Environment variables

Create a .env file to the root of the project. The following variables are required:

- `APP_HOST`: The host for the application.
- `APP_PORT`: The port for the application.
- `PIPELINE_DIR`: The directory of the Nextflow pipeline.
- `NEXTFLOW_PATH`: The path to the Nextflow executable.
- `UPLOAD_DIR`: The directory where uploaded files will be stored.

### Usage

The following starts the server with all the required privileges.

```
deno run --watch --allow-net --allow-env --allow-read --allow-write --allow-run --allow-ffi app.ts
```

# API Documentation

The server provides the following endpoints:

## 1. POST /upload

### Request

The POST request should have a multipart/form-data content type and include at least the file. All available fields: 

- do_language_id (default: false). Skips parts of the audio not identified as Estonian.
- do_speaker_id (default: true). Tries to identify speakers by name. Only works for some Estonian politicians, radio personalities and other celebrities.
- do_punctuation (default: true). Capitilizes letters and adds punctuation based on Estonian grammar rules.

### Response

A successful response will be HTTP 201 with content-type application/json and the following content: 

  {
    "success": true,
    "requestId", "77101bdb-f073-4c74-9137-db3d45b59990"
  }
The requestId can then be used to get progress information and the final result from the endpoint GET /progress/{requestID} .

Otherwise there will be an a HTTP 400 error response:
  {
      success: false,
      data: "No data included.",
  }
Or a HTTP 422 response: 
  {
    success: false,
    data: "Maximum upload size exceeded .."
  }

### Example

An example request from the command line to consume the API:

```
curl -i -X POST -F "data=@audio.mp3" http://localhost:7700/upload
```
## 2. GET /upload

This return HTML and is only useful to manually upload a file and to see what options are available. It submits a form to the POST /upload endpoint.

## 3. GET /progress/{requestId}

### Request
The {requestId} should be replaced with the requestId that the POST /upload endpoint returned.

### Response
Successful in progress response, not finished:

  {
    done: false,
    requestId: "77101bdb-f073-4c74-9137-db3d45b59990",
    progressPercentage: 50.0,
    jobStatus: "started",
    currentTaskNumber: "7",
    currentTaskName: "punctuation",
    currentTaskStatus: "started",
    totalJobsQueued: 10,
    totalJobsStarted: 6
  }

Possible jobStatus values: "started" | "process_submitted" | "process_started"  | "process_completed" | "queued"

Finished:

{
  done: true,
  success: true,
  requestId: params.requestId
}

Unsuccessful result:

{
  done: true,
  success: false,
  requestId: params.requestId,
  errorCode: 0,
  errorMessage: "processingFailed"
}

#### Error responses: 

Not found error HTTP 404

HTTP 404
{
  requestId: "77101bdb-f073-4c74-9137-db3d45b59990",
  errorCode: 1
}

## 4. GET /result/{requestId}

If the processing was succesful, the response is a JSON result.

If the processing has not finished, the response is:

  {
    done: false,
    requestId: "77101bdb-f073-4c74-9137-db3d45b59990"
  }

In case the processing failed: 

HTTP 200
  {
    done: true,
    success: false,
    requestId: "77101bdb-f073-4c74-9137-db3d45b59990",
    errorCode: 0,
    errorMessage: 
  }

In case of a bad request:

HTTP 400
  {
    requestId: "77101bdb-f073-4c74-9137-db3d45b59990",
    errorCode: 2
  }

In case requestId not found: 

HTTP 404
{
  requestId: "77101bdb-f073-4c74-9137-db3d45b59990",
  errorCode: 1
}

## 5. POST /delete/{requestId}

Deletes the results folder from disk. 

Directory successfully deleted: 

HTTP 200
  {
    success: true,
    requestId: "77101bdb-f073-4c74-9137-db3d45b59990",
  }

In case deleting failed (e.g. directory already deleted): 

HTTP 200
  {
    success: false,
    requestId: "77101bdb-f073-4c74-9137-db3d45b59990",
  }

In case of a bad request:

HTTP 400
  {
    requestId: "77101bdb-f073-4c74-9137-db3d45b59990",
  }

In case requestId not found: 

HTTP 404
{
  requestId: "77101bdb-f073-4c74-9137-db3d45b59990",
}