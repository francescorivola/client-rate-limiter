const fetch = require('node-fetch')
const index = require('../index')

const limiter = index({ concurrency: 1 })

let count = 0

async function main () {
  try {
    while (true) {
      count++
      console.log(await limiter(doRequest), new Date())
      console.log('Request', count, 'completed')
    }
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

main()

async function doRequest (waitAndRetry) {
  console.log('Request', count)
  const response = await fetch('http://localhost:3000/echo', {
    method: 'POST',
    body: JSON.stringify({
      count
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  })
  if (response.status === 429) {
    const rateLimitReset = response.headers.get('x-ratelimit-reset')
    const waitInMS = (parseInt(rateLimitReset) + 1) * 1000
    return waitAndRetry(waitInMS)
  }
  return await response.json()
};
