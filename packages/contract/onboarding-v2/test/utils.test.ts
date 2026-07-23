import { WalletType } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import {
  getBlockchainNameForOptionId,
  getDerivationTypesForBlockchain,
  getHwBlockchainSupportForWalletType,
  getMaxHwAccountIndex,
  isDeviceAccountSelection,
} from '../src/utils';

import type {
  DerivationType,
  HwBlockchainSupport,
  HardwareIntegrationId,
} from '../src/types';

const support: HwBlockchainSupport[][] = [
  [
    {
      deviceOptionId: 'seed-signer' as HardwareIntegrationId,
      walletType: WalletType.HardwareSeedSigner,
      blockchainName: 'Cardano',
    },
    {
      deviceOptionId: 'seed-signer-bitcoin' as HardwareIntegrationId,
      walletType: WalletType.HardwareSeedSigner,
      blockchainName: 'Bitcoin',
      accountSelection: 'device',
    },
  ],
  [
    {
      deviceOptionId: 'ledger' as HardwareIntegrationId,
      walletType: WalletType.HardwareLedger,
      blockchainName: 'Cardano',
    },
  ],
  [
    {
      deviceOptionId: 'keystone' as HardwareIntegrationId,
      walletType: WalletType.HardwareKeystone,
      blockchainName: 'Cardano',
      maxAccountIndex: 24,
    },
  ],
];

describe('getBlockchainNameForOptionId', () => {
  it('returns Bitcoin for the Bitcoin Seed Signer option id', () => {
    expect(
      getBlockchainNameForOptionId(
        support,
        'seed-signer-bitcoin' as HardwareIntegrationId,
      ),
    ).toBe('Bitcoin');
  });

  it('returns Cardano for the Cardano Seed Signer option id', () => {
    expect(
      getBlockchainNameForOptionId(
        support,
        'seed-signer' as HardwareIntegrationId,
      ),
    ).toBe('Cardano');
  });

  it('returns Cardano for a single-blockchain HW option (Ledger)', () => {
    expect(
      getBlockchainNameForOptionId(support, 'ledger' as HardwareIntegrationId),
    ).toBe('Cardano');
  });

  it('returns undefined when no support entry matches (no silent guess)', () => {
    expect(
      getBlockchainNameForOptionId(support, 'unknown' as HardwareIntegrationId),
    ).toBeUndefined();
  });

  it('returns undefined when support is undefined (no silent guess)', () => {
    expect(
      getBlockchainNameForOptionId(
        undefined,
        'seed-signer-bitcoin' as HardwareIntegrationId,
      ),
    ).toBeUndefined();
  });
});

describe('getHwBlockchainSupportForWalletType', () => {
  it('lists both Seed Signer blockchains with their per-blockchain option ids', () => {
    expect(
      getHwBlockchainSupportForWalletType(
        support,
        WalletType.HardwareSeedSigner,
      ),
    ).toEqual([
      { blockchainName: 'Cardano', optionId: 'seed-signer' },
      { blockchainName: 'Bitcoin', optionId: 'seed-signer-bitcoin' },
    ]);
  });

  it('lists a single entry for a single-blockchain HW type (Ledger)', () => {
    expect(
      getHwBlockchainSupportForWalletType(support, WalletType.HardwareLedger),
    ).toEqual([{ blockchainName: 'Cardano', optionId: 'ledger' }]);
  });

  it('returns an empty list when support is undefined', () => {
    expect(
      getHwBlockchainSupportForWalletType(
        undefined,
        WalletType.HardwareSeedSigner,
      ),
    ).toEqual([]);
  });
});

describe('getDerivationTypesForBlockchain', () => {
  const derivationTypes: DerivationType[] = ['ICARUS', 'ICARUS_TREZOR'];

  it('passes the device derivation types through for Cardano', () => {
    expect(getDerivationTypesForBlockchain('Cardano', derivationTypes)).toBe(
      derivationTypes,
    );
  });

  it('returns undefined for Bitcoin even when the device declares derivation types', () => {
    expect(
      getDerivationTypesForBlockchain('Bitcoin', derivationTypes),
    ).toBeUndefined();
  });

  it('returns undefined for Cardano when the device declares no derivation types', () => {
    expect(
      getDerivationTypesForBlockchain('Cardano', undefined),
    ).toBeUndefined();
  });

  it('returns undefined for a non-Cardano blockchain without derivation types', () => {
    expect(
      getDerivationTypesForBlockchain('Bitcoin', undefined),
    ).toBeUndefined();
  });
});

describe('isDeviceAccountSelection', () => {
  it('returns true by option id when the entry declares device selection', () => {
    expect(
      isDeviceAccountSelection(support, {
        optionId: 'seed-signer-bitcoin' as HardwareIntegrationId,
      }),
    ).toBe(true);
  });

  it('returns true by walletType + blockchainName when the entry declares device selection', () => {
    expect(
      isDeviceAccountSelection(support, {
        walletType: WalletType.HardwareSeedSigner,
        blockchainName: 'Bitcoin',
      }),
    ).toBe(true);
  });

  it('returns false when the entry does not set accountSelection', () => {
    expect(
      isDeviceAccountSelection(support, {
        walletType: WalletType.HardwareSeedSigner,
        blockchainName: 'Cardano',
      }),
    ).toBe(false);
    expect(
      isDeviceAccountSelection(support, {
        optionId: 'ledger' as HardwareIntegrationId,
      }),
    ).toBe(false);
  });

  it('returns false when no entry matches', () => {
    expect(
      isDeviceAccountSelection(support, {
        optionId: 'unknown' as HardwareIntegrationId,
      }),
    ).toBe(false);
  });

  it('returns false when support is undefined', () => {
    expect(
      isDeviceAccountSelection(undefined, {
        optionId: 'seed-signer-bitcoin' as HardwareIntegrationId,
      }),
    ).toBe(false);
  });
});

describe('getMaxHwAccountIndex', () => {
  it('returns the device limit by option id', () => {
    expect(
      getMaxHwAccountIndex(support, {
        optionId: 'keystone' as HardwareIntegrationId,
      }),
    ).toBe(24);
  });

  it('returns the device limit by walletType + blockchainName', () => {
    expect(
      getMaxHwAccountIndex(support, {
        walletType: WalletType.HardwareKeystone,
        blockchainName: 'Cardano',
      }),
    ).toBe(24);
  });

  it('returns undefined when the entry declares no limit', () => {
    expect(
      getMaxHwAccountIndex(support, {
        optionId: 'ledger' as HardwareIntegrationId,
      }),
    ).toBeUndefined();
  });

  it('returns undefined when no entry matches', () => {
    expect(
      getMaxHwAccountIndex(support, {
        optionId: 'unknown' as HardwareIntegrationId,
      }),
    ).toBeUndefined();
  });

  it('returns undefined when support is undefined', () => {
    expect(
      getMaxHwAccountIndex(undefined, {
        optionId: 'keystone' as HardwareIntegrationId,
      }),
    ).toBeUndefined();
  });
});
