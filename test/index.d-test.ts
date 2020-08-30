import createRateLimiter from '../index';
import { expectAssignable } from 'tsd'

const options = { concurrency: 1};
expectAssignable<{
    concurrency: number;
}>(options);

const limiter = createRateLimiter(options);

expectAssignable<<T>(func: (hold: (options: { holdMs: number, retry?: boolean}) => void) => Promise<T>) => Promise<T>>(limiter);

type A = { a: number; };
let retry = true;

async function main() {
    await limiter<A>(async hold => {
        expectAssignable<(options: { holdMs: number, retry?: boolean}) => void>(hold);
        if (retry) {
            hold({ holdMs: 1, retry: true });
        }
        return { a: 1 };
    });
    process.exit(0);
}
main();