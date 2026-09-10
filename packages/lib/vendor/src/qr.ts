/**
 * `@lace-lib/vendor/qr` — QR render (`qrcode`) + scan-decode (`jsqr`), a LIGHT
 * co-load group
 * ([ADR 37](../../../../docs/adr/37-host-supply-chain-isolation.md)).
 *
 * CONSUMERS: the air-gapped exchange / pairing surfaces — `qrcode` renders the
 * animated-QR frames the host shows the offline device; `jsqr` decodes the
 * frames the host's camera scans back. Both are pure JS. The split is
 * STRUCTURAL, not a tree-shaking hope: this entry must NEVER pull the
 * `@cardano-sdk` surface, the Ledger signing tree, or the Midnight engine
 * (pinned by the build's `LIGHT_ENTRY_EXCLUSIONS`), so a render / scan document
 * loads without any heavy trusted tree.
 *
 * Exact-surface: `qrcode`'s browser field maps the entry to lib/browser.js
 * (fs:false), so the bundle stays browser-safe; `jsqr` is a pure default export.
 */
export { toCanvas, toDataURL } from 'qrcode';
export type { QRCodeRenderersOptions, QRCodeToDataURLOptions } from 'qrcode';
export { default as jsQR } from 'jsqr';
