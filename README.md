# client-rate-limiter
Simple lib to handle client http requests throttling to http apis that implement rate limit.

[ ![Npm Version](https://badge.fury.io/js/client-rate-limiter.svg)](https://www.npmjs.com/package/client-rate-limiter)
[![Actions Status](https://github.com/francescorivola/client-rate-limiter/workflows/Node%20CI/badge.svg)](https://github.com/francescorivola/client-rate-limiter/actions)
[![CodeFactor](https://www.codefactor.io/repository/github/francescorivola/client-rate-limiter/badge)](https://www.codefactor.io/repository/github/francescorivola/client-rate-limiter)
[![codecov](https://codecov.io/gh/francescorivola/client-rate-limiter/branch/master/graph/badge.svg)](https://codecov.io/gh/francescorivola/client-rate-limiter)
[![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=francescorivola/client-rate-limiter)](https://dependabot.com)

## Installation

` npm install --save client-rate-limiter `

## The Problem

Most http apis implement rate limit mechanisms to protect them against DoS attacks. Client applications that interact with such http apis must take into account these limits to ensure http requests do not get lost.

i.e.: a cron application that every day syncronizes purchase orders from one system to another.

Some library solves this issue managing a client rate limit where you establish a time windows and a rate. This approach is valid however has the following issues:
1. rate limit tipically is hardcoded and must be updated if the rate limit of the http api change over time
2. in application that works in multiple process, the rating mechanism must keep the state in sync between processes, so databases such Redis are used for this job. This increases the complexity of the arquitecture required to implement this solution.

## The Solution

This library takes a different approach. It takes advantage of the api http response headers returned by the server to let you limit your http requests.

Rate limit server solutions tipically implement the following headers:
* **X-RateLimit-Reset**: indicates when the current window ends, in seconds from the current time.
* **X-RateLimit-Remaining**: indicates how many calls you have remaining in this window.

So, with any response you can know if you are hitting the server limit or not and how much time you have until the counter got resetted.

The library implements internally a queue and provides an **hold** function to determinate if the queue processing must be set in hold during a specific duration and if retry or not the operation.

## Example

The example below is a client app that performs http requests to an echo server.

The client rate limiter is created with concurrency set to 1, so the lib will serialize internally all http requests.

The function of the limiter has a **hold** function that allow you to set the limiter in hold for a given duration in milliseconds and retry or not the operation.

In the example we can see that if the response status is 200 and x-ratelimit-remaining is 0, we assume we have reached the max number of requests for server time windows. In this case we call the hold function with the number of milliseconds given from the response header x-ratelimit-reset.

In case the response status is 429, we call the hold function with the retry option set to true. The library will re-enqueued the request at the tail of the queue to be processed as soon as the hold period ends.

```
const fetch = require('node-fetch');
const createClientRateLimiter = require('client-rate-limiter');

const limiter = createClientRateLimiter({ concurrency: 1 });

async function main () {
  try {
    while (true) {
      const result = await limiter(async (hold) => {
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
