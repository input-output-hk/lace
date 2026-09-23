import {
  MAINNET_REALFI_CONFIG,
  PREPROD_REALFI_CONFIG,
  PREVIEW_REALFI_CONFIG,
} from '@lace-contract/realfi-staking';
import { describe, expect, it, vi } from 'vitest';

// The content component pulls the navigation lib's native sheet module, which
// node/vitest cannot resolve; the customisation wiring is what's under test.
vi.mock('../src/components/TokenDetailManageStake', () => ({
  TokenDetailManageStake: () => null,
}));

import loadTokenDetailsUICustomisations, {
  isUsdrToken,
} from '../src/exported-modules/token-details-ui-customization';

import type { Token } from '@lace-contract/tokens';

const token = (tokenId: string) => ({ tokenId } as unknown as Token);

describe('token-details UI customisation (USDr Manage Stake entry)', () => {
  it('matches USDr on every configured network and nothing else', () => {
    for (const config of [
      PREVIEW_REALFI_CONFIG,
      PREPROD_REALFI_CONFIG,
      MAINNET_REALFI_CONFIG,
    ]) {
      expect(isUsdrToken(token(config.usdrTokenId))).toBe(true);
      expect(isUsdrToken(token(config.susdrTokenId))).toBe(false);
    }
    expect(isUsdrToken(token('lovelace'))).toBe(false);
  });

  it('contributes the Manage Stake content gated by the USDr selector', () => {
    const customisation = loadTokenDetailsUICustomisations();
    expect(customisation.key).toBe('realfi-usdr');
    expect(
      customisation.uiCustomisationSelector(
        token(PREVIEW_REALFI_CONFIG.usdrTokenId),
      ),
    ).toBe(true);
    expect(customisation.RecentTransactionsContent).toBeDefined();
    expect(customisation.getTagConfig(token('any'))).toBeUndefined();
  });
});
