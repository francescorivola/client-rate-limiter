const once = require('./once');
const { equal } = require('assert');

/**
 *
 * This function creates a new instance of the client rate limiter.
 * Each instance holds its own queue and state.
 *
 * @param {*} [options={ concurrency: 1 }] the options of the client rate limiter instance
 * @returns
 */
function createClientRateLimiter(options = { concurrency: 1 }) {
  equal(isNaN(options.concurrency), false, 'options.concurrency must be a number');
  equal(options.concurrency > 0, true, 'options.concurrency must be a number greater than 0');

  let processing = 0;
  let onHold = false;
  const queue = [];

  /**
   * decorator limiter function that wraps your functions
   *
   * @param {*} func function to execute inside the limiter
   * @returns result of the func
   */
  async function clientRateLimiter(func) {
    equal(typeof func, 'function', 'function is required');
    return new Promise((resolve, reject) => {
      queue.unshift({ func, resolve, reject });
      processItemFromQueue();
    });
  }
  return clientRateLimiter;

  async function processItemFromQueue() {
    if (processing === options.concurrency || queue.length === 0 || onHold) {
      return;
    }
    const { func, resolve, reject } = queue.pop();
    let reEnqueued = false;
    processing++;
    await func(once(function hold(options) {
      equal(typeof options, 'object', 'options object is required');
      equal(isNaN(options.holdMs), false, 'options.holdMs must be a positive number');
      equal(options.holdMs >= 0, true, 'options.holdMs must be a positive number');
      if (options.retry !== undefined) {
        equal(typeof options.retry, 'boolean', 'options.retry must be a boolean');
      }
      const { holdMs, retry } = options;
      if (retry) {
        queue.push({ func, resolve, reject });
        reEnqueued = true;
      }
      if (!onHold) {
        onHold = true;
        setTimeout(() => {
          onHold = false;
          processItemFromQueue();
        }, holdMs);
      }
    })).then(callIfNotReEnqueued(resolve)).catch(callIfNotReEnqueued(reject));
    processing--;
    processItemFromQueue();

    function callIfNotReEnqueued(func) {
      return function (...args) {
        if (!reEnqueued) {
          func.apply(null, args);
        }
      };
    }
  }
}
module.exports = createClientRateLimiter;