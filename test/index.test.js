const t = require('tap');
const { AssertionError } = require('assert');
const createClientRateLimiter = require('../index');

t.test('lib should export a factory function', t => {
  t.type(createClientRateLimiter, 'function');
  t.end();
});

t.test('createClientRateclientRateLimiter should return a function', t => {
  const clientRateLimiter = createClientRateLimiter();
  t.type(clientRateLimiter, 'function');
  t.end();
});

t.test('createClientRateclientRateLimiter should thrown an AssertionError if concurrency options is NaN', async t => {
  try {
    createClientRateLimiter({ concurrency: 'a' });
    t.fail('should not get here');
  } catch (error) {
    t.equal(error instanceof AssertionError, true);
    t.equal(error.message, 'options.concurrency must be a number');
  }
});

t.test('createClientRateclientRateLimiter should thrown an AssertionError if concurrency options is 0 number', async t => {
  try {
    createClientRateLimiter({ concurrency: 0 });
    t.fail('should not get here');
  } catch (error) {
    t.equal(error instanceof AssertionError, true);
    t.equal(error.message, 'options.concurrency must be a number greater than 0');
  }
});

t.test('clientRateLimiter should receive a function as input parameter', async t => {
  const clientRateLimiter = createClientRateLimiter();
  try {
    await clientRateLimiter();
    t.fail('should not get here');
  } catch (error) {
    t.equal(error instanceof AssertionError, true);
    t.equal(error.message, 'function is required');
  }
});

t.test('clientRateLimiter should execute inner function', async t => {
  const clientRateLimiter = createClientRateLimiter();
  let hasBeenCalled = false;
  await clientRateLimiter(async () => { hasBeenCalled = true; });
  t.equal(hasBeenCalled, true);
});

t.test('clientRateLimiter should serialize inner function calls when concurrency options is set to 1', async t => {
  const clientRateLimiter = createClientRateLimiter({ concurrency: 1 });
  let text = '';
  await Promise.allSettled([
    clientRateLimiter(async () => {
      await wait(2);
      text += '1';
    }),
    clientRateLimiter(async () => {
      await wait(1);
      text += '2';
    }),
    clientRateLimiter(async () => {
      await wait(2);
      text += '3';
    }),
    clientRateLimiter(async () => Promise.reject(Error('Oops, something goes wrong!'))),
    clientRateLimiter(async () => { text += '4'; }),
    clientRateLimiter(async () => { text += '5'; })
  ]);
  t.equal(text, '12345');
});

t.test('clientRateLimiter hold function should throw an AssertionError if called without options', async t => {
  const clientRateLimiter = createClientRateLimiter();
  try {
    await clientRateLimiter(async hold => {
      hold();
    });
    t.fail('should not get here');
  } catch (error) {
    t.equal(error instanceof AssertionError, true);
    t.equal(error.message, 'options object is required');
  }
});

t.test('clientRateLimiter hold function should throw an AssertionError if called with options.retry as not a boolean', async t => {
  const clientRateLimiter = createClientRateLimiter();
  try {
    await clientRateLimiter(async hold => {
      hold({ holdMs: 1, retry: 'A' });
    });
    t.fail('should not get here');
  } catch (error) {
    t.equal(error instanceof AssertionError, true);
    t.equal(error.message, 'options.retry must be a boolean');
  }
});

t.test('clientRateLimiter hold function should throw an AssertionError if called with options.holdMs as NaN', async t => {
  const clientRateLimiter = createClientRateLimiter();
  try {
    await clientRateLimiter(async hold => {
      hold({ holdMs: 'A' });
    });
    t.fail('should not get here');
  } catch (error) {
    t.equal(error instanceof AssertionError, true);
    t.equal(error.message, 'options.holdMs must be a positive number');
  }
});

t.test('clientRateLimiter hold function should throw an AssertionError if called with options.holdMs as negative number', async t => {
  const clientRateLimiter = createClientRateLimiter();
  try {
    await clientRateLimiter(async hold => {
      hold({ holdMs: -1 });
    });
    t.fail('should not get here');
  } catch (error) {
    t.equal(error instanceof AssertionError, true);
    t.equal(error.message, 'options.holdMs must be a positive number');
  }
});

t.test('clientRateLimiter should wait and retry inner function calls when hold function is called with retry set to true', async t => {
  const clientRateLimiter = createClientRateLimiter({ concurrency: 1 });
  let text = '';
  let shouldRetry = true;
  await Promise.allSettled([
    clientRateLimiter(async (hold) => {
      if (shouldRetry) {
        text += '1';
        shouldRetry = false;
        hold({ holdMs: 10, retry: true });
      } else {
        text += '2';
      }
    }),
    clientRateLimiter(async () => { text += '3'; })
  ]);
  t.equal(text, '123');
});

t.test('clientRateLimiter should execute hold function once', async t => {
  const clientRateLimiter = createClientRateLimiter({ concurrency: 1 });
  let text = '';
  let shouldRetry = true;
  await Promise.allSettled([
    clientRateLimiter(async (hold) => {
      if (shouldRetry) {
        text += '1';
        shouldRetry = false;
        hold({ holdMs: 10, retry: true });
        hold({ holdMs: 10, retry: true });
      } else {
        text += '2';
      }
    }),
    clientRateLimiter(async () => { text += '3'; })
  ]);
  t.equal(text, '123');
});

t.test('clientRateLimiter should not re-hold if already holding', async t => {
  const clientRateLimiter = createClientRateLimiter({ concurrency: 2 });
  let text = '';
  let shouldRetry1 = true;
  let shouldRetry2 = true;
  await Promise.allSettled([
    clientRateLimiter(async (hold) => {
      await wait(5);
      if (shouldRetry1) {
        text += '1';
        shouldRetry1 = false;
        hold({ holdMs: 10, retry: true });
      } else {
        text += '4';
      }
    }),
    clientRateLimiter(async (hold) => {
      await wait(10);
      if (shouldRetry2) {
        text += '2';
        shouldRetry2 = false;
        hold({ holdMs: 10, retry: true });
      } else {
        text += '3';
      }
    })
  ]);
  t.equal(text, '1234');
});

t.test('clientRateLimiter should not retry if hold function is called with retry options as undefind', async t => {
  const clientRateLimiter = createClientRateLimiter({ concurrency: 1 });
  let text = '';
  await Promise.allSettled([
    clientRateLimiter(async (hold) => {
      text += '1';
      hold({ holdMs: 10 });
    }),
    clientRateLimiter(async () => { text += '2'; })
  ]);
  t.equal(text, '12');
});

t.test('clientRateLimiter should not retry if hold function is called with retry options as false', async t => {
  const clientRateLimiter = createClientRateLimiter({ concurrency: 1 });
  let text = '';
  await Promise.allSettled([
    clientRateLimiter(async (hold) => {
      text += '1';
      hold({ holdMs: 10, retry: false });
    }),
    clientRateLimiter(async () => { text += '2'; })
  ]);
  t.equal(text, '12');
});

function wait (ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
