declare namespace ClientRateLimiter {
    export type CreateClientRateLimiterOptions = { concurrency: number };
    export type HoldOptions = { holdMs: number, retry: boolean = false };
    export type Hold = (options: HoldOptions) => void;
    export type ClientRateLimiterFunc = (hold: Hold) => Promise<any>;
    export type ClientRateLimiter = (func: ClientRateLimiterFunc) => Promise<any>;
	export type CreateClientRateLimiter = (options: CreateClientRateLimiterOptions = { concurrency: 1 }) => void;
}

declare const createClientRateLimiter: clientRateLimiter.createClientRateLimiter;

export = createClientRateLimiter;