declare module 'client-rate-limiter' {
    namespace ClientRateLimiter {
        export type CreateClientRateLimiterOptions = { concurrency: number };
        export type HoldOptions = { holdMs: number, retry?: boolean};
        export type Hold = (options: HoldOptions) => void;
        export type ClientRateLimiterFunc = (hold: Hold) => Promise<any>;
        export type ClientRateLimiter = (func: ClientRateLimiterFunc) => Promise<any>
        export type CreateClientRateLimiter = (options?: CreateClientRateLimiterOptions) => void;
    }
    const createClientRateLimiter: ClientRateLimiter.CreateClientRateLimiter;

    export = createClientRateLimiter;
}