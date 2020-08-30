# client-rate-limiter example

In this folder you can find a simple example of how you can use this create-rate-limiter.

## Introduction

This example is composed of two apps:

1. **server.js**: this is a simple web server. It exposes an echo POST endpoint. It also has configured a rate limit that allows only 5 http requests every 10 seconds.
2. **client.js**: simple app that performs request to the http server above and use the library to hold and retry requests when the server rate limit is reached.

## Run the example

To run the example you must first run the following command:

```npm ci```

Then from one console run the server:

```node server.js```

Finally run the client

```node client.js```