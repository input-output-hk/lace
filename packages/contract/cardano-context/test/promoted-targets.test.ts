import { Cardano } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import {
  pickPromotedInformation,
  promotedNetworkKeyForChainId,
} from '../src/promoted-targets';

describe('promotedNetworkKeyForChainId', () => {
  it('maps each known Cardano network', () => {
    expect(promotedNetworkKeyForChainId(Cardano.ChainIds.Mainnet)).toBe(
      'mainnet',
    );
    expect(promotedNetworkKeyForChainId(Cardano.ChainIds.Preprod)).toBe(
      'preprod',
    );
    expect(promotedNetworkKeyForChainId(Cardano.ChainIds.Preview)).toBe(
      'preview',
    );
    expect(promotedNetworkKeyForChainId(Cardano.ChainIds.Sanchonet)).toBe(
      'sanchonet',
    );
  });

  it('returns undefined for an unknown network magic', () => {
    expect(
      promotedNetworkKeyForChainId({
        networkId: Cardano.NetworkId.Testnet,
        networkMagic: 999_999 as Cardano.NetworkMagic,
      }),
    ).toBeUndefined();
  });
});

describe('pickPromotedInformation', () => {
  it('returns undefined when no information is provided', () => {
    expect(pickPromotedInformation(undefined, 'en')).toBeUndefined();
  });

  it('prefers an exact language match', () => {
    expect(
      pickPromotedInformation({ en: 'English', es: 'Español' }, 'es'),
    ).toBe('Español');
  });

  it('falls back to the 2-letter language prefix', () => {
    expect(pickPromotedInformation({ es: 'Español' }, 'es-419')).toBe(
      'Español',
    );
  });

  it('falls back to English when the requested language is absent', () => {
    expect(pickPromotedInformation({ en: 'English' }, 'ja')).toBe('English');
  });

  it('falls back to the first available entry when English is absent', () => {
    expect(pickPromotedInformation({ ja: '日本語' }, 'es')).toBe('日本語');
  });
});
