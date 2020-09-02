# client-rate-limiter
Simple lib to handle client http throttled requests taking advantage of the server rate limit response headers.

[ ![Npm Version](https://badge.fury.io/js/client-rate-limiter.svg)](https://www.npmjs.com/package/client-rate-limiter)
[![Actions Status](https://github.com/francescorivola/client-rate-limiter/workflows/Node%20CI/badge.svg)](https://github.com/francescorivola/client-rate-limiter/actions)
[![CodeFactor](https://www.codefactor.io/repository/github/francescorivola/client-rate-limiter/badge)](https://www.codefactor.io/repository/github/francescorivola/client-rate-limiter)
[![codecov](https://codecov.io/gh/francescorivola/client-rate-limiter/branch/master/graph/badge.svg)](https://codecov.io/gh/francescorivola/client-rate-limiter)
[![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=francescorivola/client-rate-limiter)](https://dependabot.com)

## Installation

```npm install --save client-rate-limiter```

## The Problem

Most http apis implement rate limit mechanisms to protect them against DoS attacks. Client applications that interact with such http apis must take into account these limits to ensure no http requests get lost.

i.e.: a cron application that every day synchronizes orders from one system to another.

Some library solves this issue managing a client rate limit where you specify a time window and a rate. This approach is valid however has the following issues:
1. rate limit typically is hard-coded in the client and must be updated if the rate limit of the http api change over time.
2. in application that works in multiple instances, the rating mechanism must keep the state in sync between them, so typically databases such Redis are used for this job. This increases the complexity of the architecture required to implement this solution.

## The Solution

This library takes a different approach. It takes advantage of the api http response headers returned by the server to let you limit your http requests in the client.

It solves the two issues explained above as:
1. the rate limit is not specified or hard-coded as it taken from the server, and it will adapt in case the server increases or decreases its rate limits values.
2. it works out of the box in application running in multiple instance. The rate limit state does not need to be stored in any database as is kept by the server itself.

Rate limit server solutions typically implement the following headers:
* **X-RateLimit-Reset**: indicates when the current window ends, in seconds from the current time.
* **X-RateLimit-Remaining**: indicates how many calls you have remaining in the current time window.

So, given an http response you can know if you are hitting the server limit or not and how much time you have until the counter is reset.

The library implements internally a simple FIFO queue and provides an **hold** function to determinate if the queue processing must be set in hold during a specific duration and if retry or not the operation/request.

## Options

### createClientRateLimiter(options)

The library exports a factory function that returns a new instance of the client rate limiter.

The options argument is composed by the following properties:

|Name|Type|Description|Default|
|----|----|-----------|-------|
|`concurrency`|number|how many operations are consumed concurrently from the client request limiter queue.|`1`|

**IMPORTANT NOTE**: It is very important to set a proper value for the `concurrency` property. The value will depend mostly on your application use case. i.e.: set concurrency to 1 in an application that performs more than 1 call simultaneously to the limiter function could potentially imply an increase in memory usage and operations enqueued in the delimiter queue.

### clientRateLimiter(func)

The client rate limiter instance is a decorator function that wraps the function that performs the http request.

The decorated function returns a promise.

Note that this library is not tied to any specific http request library. Inside your decorated function you can use whatever library you want to perform the http request (request, node-fetch, native http/https node modules, etc...);

### hold(options)

The library executes the decorated function passing as input parameter the `hold` function that allows you to set the client rate limiter in hold for a given duration in milliseconds and retry or not the operation.

The options argument is composed by the following properties:

|Name|Type|Description|Default|
|----|----|-----------|-------|
|`holdMs`|number|how many milliseconds the client rate limiter will be set in hold and stop processing other operations from its queue. Note that, while the client rate limiter is in hold state, new operations can be added to the queue.||
|`retry`|boolean|when set to `true` the library retries the operation adding back it at the tail of the queue to be processed as soon as the hold period ends.|`false`|

## Example

The example below is a client app that performs http requests to an echo server.

```js
const fetch = require('node-fetch');
const createClientRateLimiter = require('client-rate-limiter');

const limiter = createClientRateLimiter({ concurrency: 1 });

async function main () {
  try {
    while (true) {
      const result = await limiter(async hold => {
        const response = await fetch('http://localhost:3000/echo', {
          method: 'POST',
          body: JSON.stringify({
            date: new Date()
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        });
        if (response.status === 429) {
          const rateLimitReset = response.headers.get('x-ratelimit-reset');
          const holdMs = (parseInt(rateLimitReset) + 1) * 1000;
          hold({ holdMs, retry: true });
          return;
        }
        if (response.status === 200 && parseInt(response.headers.get('x-ratelimit-remaining')) === 0) {
          const rateLimitReset = response.headers.get('x-ratelimit-reset');
          const holdMs = (parseInt(rateLimitReset) + 1) * 1000;
          hold({ holdMs, retry: false });
        }
        return await response.json();
      });
      console.log(result);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
main();
```

The client rate limiter is created with concurrency set to 1, so the lib will serialize internally all http requests.

In the example we can see that if the response status is 200 and the response header x-ratelimit-remaining is 0, we assume we have reached the max number of requests for the current server time window. In this case we call the hold function with the number of milliseconds given from the response header x-ratelimit-reset.

In case the response status is 429, we have reached the server rate limit and our request has been throttled. So, we call the hold function with the retry option set to true and return undefined. The library will enqueue againg the request at the tail of the queue to be processed as soon as the hold period ends.

The full example can be found in the repo in the [example](./example) folder.

## License

MIT