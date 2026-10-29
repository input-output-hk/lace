// The stable SDK build resolves this file in place of extension-exports.ts:
// the stable SDK uses none of the features the canary build adds, and serves
// no signer requests.
// stable-omits: ExtensionSignerRequestPayloads, PasskeySessionKeySource
// stable-omits: ServeSignerRequestsProps, SignerFlow, SignerFlowKind
// stable-omits: SignerRequestHandlers, createPasskeySessionKeySource
// stable-omits: serveSignerRequests, SignerKeyring, SignerLiveReader
// stable-omits: SignerRemovedDevice
export {};
