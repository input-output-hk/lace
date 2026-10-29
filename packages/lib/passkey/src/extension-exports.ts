// The exports the Passport account and custody account features use: the key
// source with Passport's accessors, the request kinds they add and the signer
// page's request server. The stable SDK build resolves
// extension-exports.stable.ts instead, which exports none of them.
// Keep the two files' exports in step, apart from the names the variant
// declares on stable-omits lines; the SDK's stable variant parity check
// enforces it.
export { createPasskeySessionKeySource } from './session-key-source';
export type { PasskeySessionKeySource } from './session-key-source';
export { serveSignerRequests } from './remote/server';
export type {
  ServeSignerRequestsProps,
  SignerRequestHandlers,
} from './remote/server';
export type {
  ExtensionSignerRequestPayloads,
  SignerFlow,
  SignerFlowKind,
  SignerKeyring,
  SignerLiveReader,
  SignerRemovedDevice,
} from './remote/protocol-extensions';
