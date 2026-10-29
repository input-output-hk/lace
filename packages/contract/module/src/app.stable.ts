// The stable SDK build resolves this file in place of `app.ts`: the SDK runs
// modules as one app, so its published types name no other.

/** Identifies the host application the modules run in: the SDK. */
export type App = 'lace-sdk';
