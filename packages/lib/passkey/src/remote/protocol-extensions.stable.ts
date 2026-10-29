// The stable SDK build resolves this file in place of protocol-extensions.ts:
// the stable SDK sends the Cardano request kinds only.
// stable-omits: SignerFlow, SignerFlowKind, SignerKeyring, SignerLiveReader
// stable-omits: SignerRemovedDevice

/** The request payloads the features add, by kind: none. */
export type ExtensionSignerRequestPayloads = Record<never, never>;
