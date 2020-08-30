const t = require('tap');
const { AssertionError } = require('assert');
const { createLimiter } = require('../index');

t.test('lib should export a factory function', t => {
  t.type(createLimiter, 'function');
  t.end();
});

t.test('createLimiter should return a function', t => {
  const limiter = createLimiter();
  t.type(limiter, 'function');
  t.end();
});

t.test('createLimiter should thrown an AssertionError if concurrency options is NaN', async t => {
  try {
    createLimiter({ concurrency: 'a' });
    t.fail('should not get here');
  } catch (error) {
    t.equal(error instanceof AssertionError, true);
    t.equal(error.message, 'options.concurrency must be a positive number or Infinity');
  }
});

t.test('createLimiter should thrown an AssertionError if concurrency options is a negative number', async t => {
  try {
    createLimiter({ concurrency: -1 });
    t.fail('should not get here');
  } catch (error) {
    t.equal(error instanceof AssertionError, true);
    t.equal(error.message, 'options.concurrency must be a positive number or Infinity');
  }
});

t.test('limiter should receive a function as input parameter', async t => {
  const limiter = createLimiter();
  try {
    await limiter();
    t.fail('should not get here');
  } catch (error) {
    t.equal(error instanceof AssertionError, true);
    t.equal(error.message, 'function is required');
  }
});

t.test('limiter should execute inner function', async t => {
  const limiter = createLimiter();
  let hasBeenCalled = false;
  await limiter(async () => { hasBeenCalled = true; });
  t.equal(hasBeenCalled, true);
});

t.test('limiter should serialize inner function calls when concurrency options is set to 1', async t => {
  const limiter = createLimiter({ concurrency: 1 });
  let text = '';
  await Promise.allSettled([
    limiter(async () => {
      await wait(2);
      text += '1';
    }),
    limiter(async () => {
      await wait(1);
      text += '2';
    }),
    limiter(async () => {
      await wait(2);
      text += '3';
    }),
    limiter(async () => Promise.reject(Error('Oops, something goes wrong!'))),
    limiter(async () => { text += '4'; }),
    limiter(async () => { text += '5'; })
  ]);
  t.equal(text, '12345');
});

t.test('limiter hold function should throw an AssertionError if called without options', async t => {
  const limiter = createLimiter();
  try {
    await limiter(async hold => {
      hold();
    });
    t.fail('should not get here');
  } catch (error) {
    t.equal(error instanceof AssertionError, true);
    t.equal(error.message, 'options object is required');
  }
});

t.test('limiter hold function should throw an AssertionError if called with options.retry as not a boolean', async t => {
  const limiter = createLimiter();
  try {
    await limiter(async hold => {
      hold({ holdMs: 1, retry: 'A' });
    });
    t.fail('should not get here');
  } catch (error) {
    t.equal(error instanceof AssertionError, true);
    t.equal(error.message, 'options.retry must be a boolean');
  }
});

t.test('limiter hold function should throw an AssertionError if called with options.holdMs as NaN', async t => {
  const limiter = createLimiter();
  try {
    await limiter(async hold => {
      hold({ holdMs: 'A' });
    });
    t.fail('should not get here');
  } catch (error) {
    t.equal(error instanceof AssertionError, true);
    t.equal(error.message, 'options.holdMs must be a positive number');
  }
});

t.test('limiter hold function should throw an AssertionError if called with options.holdMs as negative number', async t => {
  const limiter = createLimiter();
  try {
    await limiter(async hold => {
      hold({ holdMs: -1 });
    });
    t.fail('should not get here');
  } catch (error) {
    t.equal(error instanceof AssertionError, true);
    t.equal(error.message, 'options.holdMs must be a positive number');
  }
});

t.test('limiter should wait and retry inner function calls when hold function is called with retry set to true', async t => {
  const limiter = createLimiter({ concurrency: 1 });
  let text = '';
  let shouldRetry = true;
  await Promise.allSettled([
    limiter(async (hold) => {
      if (shouldRetry) {
        text += '1';
        shouldRetry = false;
        hold({ holdMs: 10, retry: true });
      } else {
        text += '2';
      }
    }),
    limiter(async () => { text += '3'; })
  ]);
  t.equal(text, '123');
});

t.test('limiter should execute hold function once', async t => {
  const limiter = createLimiter({ concurrency: 1 });
  let text = '';
  let shouldRetry = true;
  await Promise.allSettled([
    limiter(async (hold) => {
      if (shouldRetry) {
        text += '1';
        shouldRetry = false;
        hold({ holdMs: 10, retry: true });
        hold({ holdMs: 10, retry: true });
      } else {
        text += '2';
      }
    }),
    limiter(async () => { text += '3'; })
  ]);
  t.equal(text, '123');
});

t.test('limiter should not re-hold if already holding', async t => {
  const limiter = createLimiter({ concurrency: 2 });
  let text = '';
  let shouldRetry1 = true;
  let shouldRetry2 = true;
  await Promise.allSettled([
    limiter(async (hold) => {
      await wait(5);
      if (shouldRetry1) {
        text += '1';
        shouldRetry1 = false;
        hold({ holdMs: 10, retry: true });
      } else {
        text += '4';
      }
    }),
    limiter(async (hold) => {
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

t.test('limiter should not retry if hold function is called with retry options as undefind', async t => {
  const limiter = createLimiter({ concurrency: 1 });
  let text = '';
  await Promise.allSettled([
    limiter(async (hold) => {
      text += '1';
      hold({ holdMs: 10 });
    }),
    limiter(async () => { text += '2'; })
  ]);
  t.equal(text, '12');
});

t.test('limiter should not retry if hold function is called with retry options as false', async t => {
  const limiter = createLimiter({ concurrency: 1 });
  let text = '';
  await Promise.allSettled([
    limiter(async (hold) => {
      text += '1';
      hold({ holdMs: 10, retry: false });
    }),
    limiter(async () => { text += '2'; })
  ]);
  t.equal(text, '12');
});

function wait (ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
