declare module 'client-rate-limiter' {
    namespace ClientRateLimiter {
        export type CreateClientRateLimiterOptions = { concurrency: number };
        export type HoldOptions = { holdMs: number, retry?: boolean};
        export type Hold = (options: HoldOptions) => void;
        export type ClientRateLimiterFunc<T> = (hold: Hold) => Promise<T>;
        export type ClientRateLimiter = <T>(func: ClientRateLimiterFunc<T>) => Promise<T>
        export type CreateClientRateLimiter = (options?: CreateClientRateLimiterOptions) => ClientRateLimiter;
    }
    const createClientRateLimiter: ClientRateLimiter.CreateClientRateLimiter;

    export = createClientRateLimiter;
}