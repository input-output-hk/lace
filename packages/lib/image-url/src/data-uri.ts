/**
 * Attacker-controlled token/NFT/dApp metadata must never reach an `<img src>`
 * as an inline SVG: SVG can carry scripts and — unlike raster data URIs — is a
 * code-execution surface if the browser's SVG-as-`<img>` sandbox ever fails
 * (NWL R1 audit M-301). Blocklisting SVG spellings is bypassable (casing,
 * percent-encoding, MIME aliases), so this *allowlists* known-safe raster
 * media types instead.
 *
 * Shared rather than duplicated per surface deliberately: this is the rule
 * whose failure mode is code execution, so the copies must not be able to
 * drift. The proxy is no help here — a `data:` payload is local bytes with
 * nothing to normalize, and the proxy would answer such a source with a dead
 * url — which is why every consumer resolves `data:` BEFORE proxying.
 */
const SAFE_RASTER_DATA_URI = /^data:image\/(png|jpe?g|gif|webp|avif|bmp)[;,]/i;

/**
 * Whether `value` is a `data:` URI at all, in any casing.
 *
 * Callers must branch on this FIRST, so no `data:` payload can reach a
 * generic-scheme passthrough without meeting {@link isSafeRasterDataUri}.
 */
export const isDataUri = (value: string): boolean => /^data:/i.test(value);

/** Whether `value` is a `data:` URI an `<img src>` may safely load. */
export const isSafeRasterDataUri = (value: string): boolean =>
  SAFE_RASTER_DATA_URI.test(value);
