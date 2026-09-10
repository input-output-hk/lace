/**
 * @vitest-environment jsdom
 */
import { AccountId } from '@lace-contract/wallet-repo';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@lace-contract/i18n', async importOriginal => ({
  ...(await importOriginal<object>()),
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

/**
 * Strips locale-specific thousands-group separators (',', '.', or a
 * no-break space) so a toLocaleString()-formatted integer can be asserted
 * on without depending on the runtime's default locale.
 */
const stripThousandsSeparators = (text: string): string =>
  text.replace(/[.,\u00A0\u202F](?=\d)/g, '');

vi.mock('@lace-lib/ui-toolkit', () => {
  const Box = ({
    children,
    testID,
  }: {
    children?: React.ReactNode;
    testID?: string;
  }) => <div data-testid={testID}>{children}</div>;
  const TextVariant = ({
    children,
    testID,
  }: {
    children?: React.ReactNode;
    testID?: string;
  }) => <span data-testid={testID}>{children}</span>;

  return {
    AccountSecurityAlertInline: ({ accountId }: { accountId: string }) => (
      <div data-testid="account-security-alert-inline">{accountId}</div>
    ),
    Column: Box,
    Row: Box,
    Divider: () => null,
    Icon: ({ testID }: { testID?: string }) => <span data-testid={testID} />,
    Text: { XS: TextVariant, S: TextVariant, M: TextVariant },
    CustomTag: ({ label, testID }: { label?: string; testID?: string }) => (
      <span data-testid={testID}>{label}</span>
    ),
    spacing: { L: 16, M: 12, S: 8, XS: 4 },
    useCopyToClipboard: () => ({ copyToClipboard: vi.fn() }),
    useTheme: () => ({
      theme: {
        background: { secondary: '#111', primary: '#222' },
        text: { primary: '#fff', secondary: '#aaa' },
        border: { middle: '#333' },
        brand: {
          yellow: '#f2c94c',
          yellowSecondary: '#fcdc7a',
          darkGray: '#595959',
        },
      },
    }),
  };
});

vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles },
  Platform: { OS: 'ios' },
  UIManager: {},
  LayoutAnimation: {
    configureNext: () => {},
    Types: { easeInEaseOut: 'easeInEaseOut' },
  },
  Animated: {
    Value: class {
      public interpolate() {
        return '0deg';
      }
    },
    timing: () => ({ start: () => {} }),
    View: ({ children }: { children?: React.ReactNode }) => (
      <div>{children}</div>
    ),
  },
  View: ({
    children,
    testID,
  }: {
    children?: React.ReactNode;
    testID?: string;
  }) => <div data-testid={testID}>{children}</div>,
  ScrollView: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Pressable: ({
    children,
    testID,
    onPress,
    disabled,
  }: {
    children?: React.ReactNode;
    testID?: string;
    onPress?: () => void;
    disabled?: boolean;
  }) => (
    <button data-testid={testID} onClick={onPress} disabled={disabled}>
      {children}
    </button>
  ),
}));

import { SignPsbtContent } from '../../src/components/SignPsbtContent';

import type { SignPsbtContentProps } from '../../src/components/SignPsbtContent';
import type { PsbtInspection } from '@lace-lib/bitcoin-psbt';

const baseInspection: PsbtInspection = {
  inputs: [
    {
      index: 0,
      address: 'bc1qown',
      value: 100_000,
      isOwn: true,
      willSign: true,
    },
  ],
  outputs: [{ index: 0, address: 'bc1qdest', value: 90_000, isOwn: false }],
  fee: 10_000,
  estimatedFeeRate: 12.5,
  netBalanceChange: -100_000,
  unresolvedInputs: [],
  warnings: {
    nonDefaultSighash: false,
    unresolvedInputValues: false,
    signsForeignInputs: false,
  },
};

const baseProps: SignPsbtContentProps = {
  dapp: { name: 'Test DApp', origin: 'https://dapp.example' },
  inspection: baseInspection,
  rawPsbtBase64: 'cHNidP8BAA==',
  currentIndex: 0,
  totalCount: 1,
  onPagerChange: () => {},
};

describe('SignPsbtContent fee rendering', () => {
  it('shows the numeric fee inside the additional information section', () => {
    render(<SignPsbtContent {...baseProps} />);

    const additionalInfoContent = screen.getByTestId(
      'sign-psbt-additional-info-section-content',
    );
    const feeRow = screen.getByTestId('sign-psbt-fee');
    const feeText = feeRow.textContent ?? '';
    expect(additionalInfoContent.contains(feeRow)).toBe(true);
    expect(stripThousandsSeparators(feeText)).toContain('10000 sats');
  });

  it('shows the fee-cannot-be-verified message instead of a number when unresolved', () => {
    const inspection: PsbtInspection = {
      ...baseInspection,
      fee: undefined,
      estimatedFeeRate: undefined,
      netBalanceChange: undefined,
      warnings: { ...baseInspection.warnings, unresolvedInputValues: true },
    };

    render(<SignPsbtContent {...baseProps} inspection={inspection} />);

    expect(screen.getByTestId('sign-psbt-fee').textContent).toContain(
      'dapp-connector.bitcoin.sign-psbt.fee-unverified',
    );
    expect(screen.queryByTestId('sign-psbt-fee-rate')).toBeNull();
  });
});

describe('SignPsbtContent warnings', () => {
  it('renders the non-default-sighash warning when present', () => {
    const inspection: PsbtInspection = {
      ...baseInspection,
      warnings: { ...baseInspection.warnings, nonDefaultSighash: true },
    };

    render(<SignPsbtContent {...baseProps} inspection={inspection} />);

    expect(
      screen.queryByTestId('sign-psbt-warning-non-default-sighash'),
    ).not.toBeNull();
  });

  it('renders the unresolved-input-values warning when present', () => {
    const inspection: PsbtInspection = {
      ...baseInspection,
      warnings: { ...baseInspection.warnings, unresolvedInputValues: true },
    };

    render(<SignPsbtContent {...baseProps} inspection={inspection} />);

    expect(
      screen.queryByTestId('sign-psbt-warning-unresolved-input-values'),
    ).not.toBeNull();
  });

  it('renders the signs-foreign-inputs warning when present', () => {
    const inspection: PsbtInspection = {
      ...baseInspection,
      warnings: { ...baseInspection.warnings, signsForeignInputs: true },
    };

    render(<SignPsbtContent {...baseProps} inspection={inspection} />);

    expect(
      screen.queryByTestId('sign-psbt-warning-signs-foreign-inputs'),
    ).not.toBeNull();
  });

  it('renders no warning banners when the inspection has none', () => {
    render(<SignPsbtContent {...baseProps} />);

    expect(
      screen.queryByTestId('sign-psbt-warning-non-default-sighash'),
    ).toBeNull();
    expect(
      screen.queryByTestId('sign-psbt-warning-unresolved-input-values'),
    ).toBeNull();
    expect(
      screen.queryByTestId('sign-psbt-warning-signs-foreign-inputs'),
    ).toBeNull();
  });
});

describe('SignPsbtContent own and foreign address tags', () => {
  it('shows the Own tag for an own From address', () => {
    render(<SignPsbtContent {...baseProps} />);

    expect(
      screen.queryByTestId('sign-psbt-from-address-0-own-tag'),
    ).not.toBeNull();
  });

  it('omits the Own tag for a foreign To address', () => {
    render(<SignPsbtContent {...baseProps} />);

    expect(screen.queryByTestId('sign-psbt-to-address-0-own-tag')).toBeNull();
  });
});

describe('SignPsbtContent raw PSBT section', () => {
  it('renders the raw PSBT expanded by default, without interaction', () => {
    render(<SignPsbtContent {...baseProps} />);

    expect(
      screen.queryByTestId('sign-psbt-raw-data-section-content'),
    ).not.toBeNull();
    expect(screen.getByTestId('sign-psbt-raw-data-copy')).not.toBeNull();
  });
});

describe('SignPsbtContent account security alert', () => {
  it('renders the account security alert first when an accountId is provided', () => {
    render(
      <SignPsbtContent
        {...baseProps}
        accountId={AccountId('bitcoin-account-0')}
      />,
    );

    const alert = screen.getByTestId('account-security-alert-inline');
    expect(alert.textContent).toBe('bitcoin-account-0');
    expect(alert.parentElement?.firstElementChild).toBe(alert);
  });

  it('omits the account security alert when no accountId is provided', () => {
    render(<SignPsbtContent {...baseProps} />);

    expect(screen.queryByTestId('account-security-alert-inline')).toBeNull();
  });
});

describe('SignPsbtContent batch pager', () => {
  it('omits the pager for a single-PSBT request', () => {
    render(<SignPsbtContent {...baseProps} totalCount={1} />);

    expect(screen.queryByTestId('sign-psbt-pager')).toBeNull();
  });

  it('navigates to the next PSBT', () => {
    const onPagerChange = vi.fn();
    render(
      <SignPsbtContent
        {...baseProps}
        currentIndex={0}
        totalCount={3}
        onPagerChange={onPagerChange}
      />,
    );

    screen.getByTestId('sign-psbt-pager-next').click();

    expect(onPagerChange).toHaveBeenCalledWith(1);
  });

  it('navigates to the previous PSBT', () => {
    const onPagerChange = vi.fn();
    render(
      <SignPsbtContent
        {...baseProps}
        currentIndex={1}
        totalCount={3}
        onPagerChange={onPagerChange}
      />,
    );

    screen.getByTestId('sign-psbt-pager-prev').click();

    expect(onPagerChange).toHaveBeenCalledWith(0);
  });

  it('disables the prev control on the first PSBT and the next control on the last', () => {
    render(<SignPsbtContent {...baseProps} currentIndex={0} totalCount={3} />);

    expect(screen.getByTestId('sign-psbt-pager-prev').disabled).toBe(true);
    expect(screen.getByTestId('sign-psbt-pager-next').disabled).toBe(false);
  });
});
