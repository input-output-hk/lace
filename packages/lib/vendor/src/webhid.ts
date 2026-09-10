/**
 * `@lace-lib/vendor/webhid` — the WebHID Ledger transport
 * (`@ledgerhq/hw-transport-webhid`), a LIGHT co-load group
 * ([ADR 37](../../../../docs/adr/37-host-supply-chain-isolation.md)).
 * WebHID is the ONE Ledger transport the closure admits (ADR 37 trim);
 * the node-hid / WebUSB transports `@cardano-sdk/hardware-ledger` statically
 * requires are stubbed fail-loud in the build (`ledgerNodeTransportFailLoud`).
 *
 * CONSUMERS: every Ledger surface that opens a device — pairing
 * (`surfaces/hw-pair.ts`), verify-address (`surfaces/ledger-verify-address.ts`),
 * the Cardano signer (`surfaces/ledger-signer.ts`) and the Bitcoin signer
 * (`surfaces/btc-ledger-signer.ts`). Like `/ledger-cardano-app` this entry must
 * NEVER pull the key-agent signing tree (`LIGHT_ENTRY_EXCLUSIONS`), so the light
 * pairing / verify documents stay small.
 *
 * Exact-surface: the default export (TransportWebHID); the surfaces call only
 * `TransportWebHID.open(device)` + `transport.close()`.
 */
export { default } from '@ledgerhq/hw-transport-webhid';
