import type { MaestroVout } from './maestro-api-schema';

const SATS_IN_BTC = 100_000_000;

/**
 * Converts a Bitcoin amount expressed as a decimal string (I.E `"0.00012345"`)
 * into its integer value in satoshis.
 *
 * @param btcString  Bitcoin amount as a string (e.g. `"2"`, `"0.5"`, `"0.00000001"`).
 * @returns          Amount in satoshis as a number.
 */
export const btcStringToSatoshis = (btcString: string): number => {
  const [integerPart, fractionPart = ''] = btcString.split('.');
  const paddedFraction = fractionPart.padEnd(8, '0').slice(0, 8);
  return Number(integerPart) * SATS_IN_BTC + Number(paddedFraction);
};

/**
 * Return the OP_RETURN payload (as hex) if the output is nulldata,
 * otherwise undefined.
 */
export const getOpReturnData = (output: MaestroVout): string | undefined => {
  const asm = output.scriptPubKey?.asm;
  if (!asm) return undefined;

  const isNullData =
    output.scriptPubKey?.type === 'nulldata' || asm.startsWith('OP_RETURN');

  if (!isNullData) return undefined;

  const [, hexPayload] = asm.split(/\s+/);
  return hexPayload ?? undefined;
};
