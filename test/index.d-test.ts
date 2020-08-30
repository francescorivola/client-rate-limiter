import createRateLimiter from '../index';

const limiter = createRateLimiter({ concurrency: 1 });

type A = { a: number; };
let retry = true;

async function main() {
    console.log(await limiter<A>(async hold => {
        console.log(retry);
        if (retry) {
            hold({ holdMs: 1, retry: true });
        }
        return { a: 1 };
    }));
    process.exit(0);
}
main();