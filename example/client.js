const fetch = require('node-fetch');
const { createClientRateLimiter } = require('../index');

const concurrency = 1;
const limiter = createClientRateLimiter({ concurrency });

let count = 0;
let promises = [];

async function main () {
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      count++;
      promises.push(createDoRequest(count)());
      if (promises.length === concurrency) {
        await Promise.all(promises);
        promises = [];
      }
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();

function createDoRequest(count) {
  return async () => {
    console.log('Request', count);
    await limiter(doRequest);
    console.log('Request', count, 'completed');
  };
}

async function doRequest (hold) {
  const response = await fetch('http://localhost:3000/echo', {
    method: 'POST',
    body: JSON.stringify({
      count
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
}
