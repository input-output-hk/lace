/**
 * @vitest-environment jsdom
 */
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: { navigate: vi.fn(), closeSheet: vi.fn() },
  SheetRoutes: { Buy: 'Buy' },
}));
vi.mock('@lace-contract/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles },
}));
vi.mock('@lace-lib/ui-toolkit', () => ({
  Sheet: { Header: () => null, Footer: () => null },
  StatusSheet: () => null,
}));
vi.mock('../../src/hooks', () => ({ useLaceSelector: vi.fn() }));
vi.mock('../../src/hooks/useCollateralState', () => ({
  useCollateralState: () => ({
    state: 'not-enough-balance',
    handleClose: vi.fn(),
  }),
}));

import { useLaceSelector } from '../../src/hooks';
import { CollateralSheet } from '../../src/pages/CollateralSheet';

const setOptions = vi.fn();
const props = {
  route: { params: { accountId: 'account-id', walletId: 'wallet-id' } },
  navigation: { setOptions },
} as unknown as Parameters<typeof CollateralSheet>[0];
type FooterProps = {
  primaryButton?: { onPress: () => void; testID: string };
  secondaryButton?: { testID: string };
};
const footer = (): FooterProps => {
  const options = setOptions.mock.lastCall?.[0] as {
    footer: React.ReactElement<FooterProps>;
  };
  return options.footer.props;
};

describe('CollateralSheet Buy availability', () => {
  beforeEach(() => vi.clearAllMocks());

  it('offers Buy when the shared network/flag gate allows it', () => {
    vi.mocked(useLaceSelector).mockReturnValue(true);
    render(React.createElement(CollateralSheet, props));
    footer().primaryButton?.onPress();
    expect(NavigationControls.navigate).toHaveBeenCalledWith(SheetRoutes.Buy);
  });

  it('keeps Cancel and hides Buy when the shared gate denies it', () => {
    vi.mocked(useLaceSelector).mockReturnValue(false);
    render(React.createElement(CollateralSheet, props));
    expect(footer().primaryButton).toBeUndefined();
    expect(footer().secondaryButton?.testID).toBe(
      'collateral-not-enough-balance-status-secondary-button',
    );
  });

  it('updates the already-open collateral footer on revocation and restoration', () => {
    vi.mocked(useLaceSelector).mockReturnValue(true);
    const screen = render(React.createElement(CollateralSheet, props));
    expect(footer().primaryButton).toBeDefined();
    vi.mocked(useLaceSelector).mockReturnValue(false);
    screen.rerender(React.createElement(CollateralSheet, props));
    expect(footer().primaryButton).toBeUndefined();
    vi.mocked(useLaceSelector).mockReturnValue(true);
    screen.rerender(React.createElement(CollateralSheet, props));
    expect(footer().primaryButton).toBeDefined();
  });
});
