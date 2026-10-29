// The stable SDK build resolves this file in place of index.ts: the SDK runs
// headless and renders nothing, so it uses none of the app's React hooks.
// stable-omits: AccountWithBlockchain, UseAccountSupportsNftsOptions
// stable-omits: UseAccountSupportsNftsResult
// stable-omits: createContextualUseUICustomisation, useAccountSupportsNfts
// stable-omits: useNftViewReset, useUICustomisation
export {};
