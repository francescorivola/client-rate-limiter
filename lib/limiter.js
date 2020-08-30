const once = require('./once')
const { equal, notEqual } = require('assert')

module.exports = function createLimiter (options = { concurrency: 1 }) {
  notEqual(isNaN(options.concurrency), true, 'options.concurrency must be a positive number or Infinity')
  notEqual(options.concurrency < 0, true, 'options.concurrency must be a positive number or Infinity')

  let processing = 0
  let onHold = false;
  const queue = []

  return async function limiter (func) {
    equal(typeof func, 'function', 'function is required')

    return new Promise((resolve, reject) => {
      queue.unshift({
        func,
        resolve,
        reject
      })
      processItemFromQueue()
    })
  }

  async function processItemFromQueue () {
    if (processing === options.concurrency || queue.length === 0 || onHold) {
      return
    }
    const { func, resolve, reject } = queue.pop()
    processing++
    await func(once(function waitAndRetry (waitMs) {
      notEqual(isNaN(waitMs), true, 'waitMs must be a positive number')
      notEqual(waitMs < 0, true, 'waitMs must be a positive number')
      queue.push({
        func,
        resolve,
        reject
      })
      if (!onHold) {
        onHold = true
        setTimeout(() => {
          onHold = false
          processItemFromQueue()
        }, waitMs)
      }
    })).then(callIfNotOnHold(resolve)).catch(callIfNotOnHold(reject))
    processing--
    processItemFromQueue()
  }

  function callIfNotOnHold (func) {
    return function (...args) {
      if (!onHold) {
        func.apply(null, args)
      }
    }
  }
}
