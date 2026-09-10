import { TokenId } from '@lace-contract/tokens';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-lib/util';
import { describe, expect, it } from 'vitest';

import { createBaseTokenSelector } from '../../src/exported-modules/base-token-selector';

import type { Address } from '@lace-contract/addresses';
import type { Token } from '@lace-contract/tokens';

const accountId = AccountId('midnight-acc');

const makeToken = (tokenId: string, ticker?: string): Token => ({
  accountId,
  address: 'mn-addr' as Address,
  blockchainName: 'Midnight',
  tokenId: TokenId(tokenId),
  available: BigNumber(1n),
  pending: BigNumber(0n),
  displayLongName: ticker ?? tokenId,
  displayShortName: ticker ?? tokenId,
  decimals: 6,
  metadata: {
    decimals: 6,
    ...(ticker ? { name: ticker, ticker } : {}),
    blockchainSpecific: {},
  },
});

const shieldedNight = makeToken('0100...night');
const unshieldedNight = makeToken('0200...night', 'tNIGHT');
const dust = makeToken('dust', 'tDUST');

describe('createBaseTokenSelector', () => {
  it('is assigned to the Midnight blockchain', () => {
    expect(createBaseTokenSelector().blockchainName).toBe('Midnight');
  });

  it('selects the ticker-bearing NIGHT token even when a shielded raw-NIGHT entry comes first', () => {
    expect(
      createBaseTokenSelector().selectBaseToken([
        shieldedNight,
        unshieldedNight,
      ]),
    ).toBe(unshieldedNight);
  });

  it('selects the mainnet NIGHT ticker', () => {
    const mainnetNight = makeToken('0200...night', 'NIGHT');

    expect(
      createBaseTokenSelector().selectBaseToken([shieldedNight, mainnetNight]),
    ).toBe(mainnetNight);
  });

  it('returns undefined when no token carries a NIGHT ticker', () => {
    expect(
      createBaseTokenSelector().selectBaseToken([shieldedNight, dust]),
    ).toBeUndefined();
  });
});
