import { describe, expect, it } from 'vitest';

import {
  isAccountSettingAvailable,
  isVaultCapabilityEnabled,
} from '../src/capability-gating';

import type { VaultCapabilities } from '@lace-contract/vault';

const capabilities = (
  over: Partial<VaultCapabilities> = {},
): VaultCapabilities => ({
  create: false,
  import: false,
  connectHardware: false,
  addAccount: false,
  renameAccount: false,
  ...over,
});

describe('isVaultCapabilityEnabled', () => {
  it('reads NOT available while the capabilities promise is unresolved', () => {
    expect(isVaultCapabilityEnabled(undefined, 'addAccount')).toBe(false);
    expect(isVaultCapabilityEnabled(undefined, 'connectHardware')).toBe(false);
  });

  it('reads each capability independently', () => {
    const resolved = capabilities({ addAccount: true });
    expect(isVaultCapabilityEnabled(resolved, 'addAccount')).toBe(true);
    expect(isVaultCapabilityEnabled(resolved, 'connectHardware')).toBe(false);
  });
});

describe('isAccountSettingAvailable', () => {
  it('offers the customise-account entry when the arm can rename an account', () => {
    expect(
      isAccountSettingAvailable(
        'customize-account',
        capabilities({ renameAccount: true }),
      ),
    ).toBe(true);
  });

  // A host predating the account-rename manager view answers the request with
  // the plain wallet list, so the entry would be a dead press (ADR 52).
  it('hides the customise-account entry when the arm cannot rename an account', () => {
    expect(
      isAccountSettingAvailable(
        'customize-account',
        capabilities({ renameAccount: false, addAccount: true }),
      ),
    ).toBe(false);
  });

  it('hides the customise-account entry while the capabilities promise is unresolved', () => {
    expect(isAccountSettingAvailable('customize-account', undefined)).toBe(
      false,
    );
  });

  it('offers entries that gate on no capability at all', () => {
    expect(isAccountSettingAvailable('your-keys', undefined)).toBe(true);
    expect(isAccountSettingAvailable('collateral', capabilities())).toBe(true);
  });
});
