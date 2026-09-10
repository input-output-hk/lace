const SATOSHIS_PER_BITCOIN = 100_000_000;
const BYTES_PER_KILOBYTE = 1000;

/**
 * Upper bound for a caller-supplied fee rate, in sat/vB. Far above any real
 * mempool spike, so it catches a unit mix-up (a BTC/kB figure arriving where
 * sat/vB is expected, or a stray exponent) without refusing an urgent send.
 */
const MAX_FEE_RATE_SATS_PER_VBYTE = 10_000;

/**
 * Converts a fee rate given in sat/vB — the unit dApp APIs and the fee input
 * speak — into the BTC-per-kilobyte rate that
 * `BitcoinBlockchainSpecificTxData.feeRate.customFeeRate` carries.
 *
 * Returns `undefined` for a rate that must not be built against: not a finite
 * number, not positive, or above {@link MAX_FEE_RATE_SATS_PER_VBYTE}. Callers
 * are expected to refuse the request rather than substitute a default — a
 * zero rate yields a transaction no node relays, and an unconverted sat/vB
 * figure overpays by five orders of magnitude.
 */
export const feeRateFromSatsPerVByte = (
  satsPerVByte: number,
): number | undefined =>
  Number.isFinite(satsPerVByte) &&
  satsPerVByte > 0 &&
  satsPerVByte <= MAX_FEE_RATE_SATS_PER_VBYTE
    ? (satsPerVByte * BYTES_PER_KILOBYTE) / SATOSHIS_PER_BITCOIN
    : undefined;
