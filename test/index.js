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

t.test('limiter waitAndRetry should throw an AssertionError if called with a NaN', async t => {
  const limiter = createLimiter();
  try {
    await limiter(async waitAndRetry => {
      waitAndRetry('A');
    });
    t.fail('should not get here');
  } catch (error) {
    t.equal(error instanceof AssertionError, true);
    t.equal(error.message, 'waitMs must be a positive number');
  }
});

t.test('limiter waitAndRetry should throw an AssertionError if called with a negative number', async t => {
  const limiter = createLimiter();
  try {
    await limiter(async waitAndRetry => {
      waitAndRetry(-1);
    });
    t.fail('should not get here');
  } catch (error) {
    t.equal(error instanceof AssertionError, true);
    t.equal(error.message, 'waitMs must be a positive number');
  }
});

t.test('limiter should wait and retry inner function calls when waitAndRetry is called', async t => {
  const limiter = createLimiter({ concurrency: 1 });
  let text = '';
  let shouldRetry = true;
  await Promise.allSettled([
    limiter(async (waitAndRetry) => {
      if (shouldRetry) {
        text += '1';
        shouldRetry = false;
        waitAndRetry(10);
      } else {
        text += '2';
      }
    }),
    limiter(async () => { text += '3'; })
  ]);
  t.equal(text, '123');
});

t.test('limiter should execute waitAndRetry once', async t => {
  const limiter = createLimiter({ concurrency: 1 });
  let text = '';
  let shouldRetry = true;
  await Promise.allSettled([
    limiter(async (waitAndRetry) => {
      if (shouldRetry) {
        text += '1';
        shouldRetry = false;
        waitAndRetry(10);
        waitAndRetry(10);
      } else {
        text += '2';
      }
    }),
    limiter(async () => { text += '3'; })
  ]);
  t.equal(text, '123');
});

t.test('limiter should not rehold if already holding', async t => {
  const limiter = createLimiter({ concurrency: 2 });
  let text = '';
  let shouldRetry1 = true;
  let shouldRetry2 = true;
  await Promise.allSettled([
    limiter(async (waitAndRetry) => {
      await wait(5);
      if (shouldRetry1) {
        text += '1';
        shouldRetry1 = false;
        waitAndRetry(10);
      } else {
        text += '4';
      }
    }),
    limiter(async (waitAndRetry) => {
      await wait(10);
      if (shouldRetry2) {
        text += '2';
        shouldRetry2 = false;
        waitAndRetry(10);
      } else {
        text += '3';
      }
    })
  ]);
  t.equal(text, '1234');
});

function wait (ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
