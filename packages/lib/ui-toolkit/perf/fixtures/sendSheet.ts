/**
 * Deterministic props for the send-form section benchmarks, in the exact
 * SendSheetProps sub-shapes the SendSheet template feeds each section
 * (sendSheetUtils types re-exported by the barrel). Raw amounts exercise the
 * real formatRawToLocale via the util-render fidelity mock. No
 * Date.now()/Math.random().
 */
import type { AssetToSend, FeeEntry } from '../../src';

const TOKENS = [
  { id: 'cardano-ada', shortName: 'ADA' },
  { id: 'cardano-hosky', shortName: 'HOSKY' },
  { id: 'cardano-djed', shortName: 'DJED' },
  { id: 'cardano-min', shortName: 'MIN' },
];

export const makeAssetsToSend = (count: number): AssetToSend[] =>
  Array.from({ length: count }, (_, index) => {
    const token = TOKENS[index % TOKENS.length];
    return {
      type: 'token' as const,
      token: {
        tokenId: token.id,
        name: token.shortName,
        symbol: token.shortName,
        decimals: 6,
        available: `${(index + 1) * 1_234_567_890}`,
        displayShortName: token.shortName,
      },
      value: `${(index + 1) * 12}.34`,
      amount: `${(index + 1) * 12_340_000}`,
    };
  });

/** Amount strings per sync/edit tick — every value changes together. */
export const makeAssetInputValues = (
  count: number,
  tick = 0,
): Array<{ tokenId: string; value: string }> =>
  Array.from({ length: count }, (_, index) => ({
    tokenId: TOKENS[index % TOKENS.length].id,
    value: `${(index + 1) * 12}.${34 + tick}`,
  }));

export const makeFeeEntries = (): FeeEntry[] => [
  {
    amount: '0.17',
    token: {
      tokenId: 'cardano-ada',
      displayShortName: 'ADA',
    },
    value: '0.07',
    currency: 'USD',
  },
];
