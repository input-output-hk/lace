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
    t: (key: string) => key,
  }),
}));

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
    Avatar: ({
      content,
      shape,
      size,
    }: {
      content: { img?: { uri: string }; fallback?: string };
      shape?: string;
      size?: number;
    }) => (
      <span data-testid="avatar" data-shape={shape} data-size={size}>
        {content.img?.uri ?? content.fallback}
      </span>
    ),
    Column: Box,
    Row: Box,
    Divider: () => null,
    Text: { XS: TextVariant, S: TextVariant, M: TextVariant },
    CustomTag: ({
      label,
      icon,
      testID,
    }: {
      label?: string;
      icon?: React.ReactNode;
      testID?: string;
    }) => (
      <span data-testid={testID}>
        {icon}
        {label}
      </span>
    ),
    spacing: { L: 16, M: 12, S: 8, XS: 4 },
    useTheme: () => ({
      theme: { background: { secondary: '#111' }, text: { primary: '#fff' } },
    }),
  };
});

vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles },
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
}));

import { SignMessageContent } from '../../src/components/SignMessageContent';

import type { SignMessageContentProps } from '../../src/components/SignMessageContent';

const baseProps: SignMessageContentProps = {
  dapp: {
    icon: { fallback: 'Test DApp' },
    name: 'Test DApp',
    origin: 'https://dapp.example',
  },
  address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  accountInfo: {
    name: 'Account 1',
    accountId: AccountId('account-1'),
  },
  message: 'Please sign this exact message, verbatim, for authentication.',
  signatureType: 'ecdsa',
};

describe('SignMessageContent message rendering', () => {
  it('renders the complete message text without truncation', () => {
    render(<SignMessageContent {...baseProps} />);

    expect(screen.getByTestId('sign-message-message').textContent).toContain(
      baseProps.message,
    );
  });
});

describe('SignMessageContent address', () => {
  it('shows the full address untruncated', () => {
    render(<SignMessageContent {...baseProps} />);

    expect(screen.getByTestId('sign-message-address').textContent).toContain(
      baseProps.address,
    );
  });

  it('renders the address card after the account block', () => {
    render(<SignMessageContent {...baseProps} />);

    const account = screen.getByTestId('sign-message-account');
    const address = screen.getByTestId('sign-message-address');
    expect(
      account.compareDocumentPosition(address) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('no longer renders an Own tag', () => {
    render(<SignMessageContent {...baseProps} />);

    expect(screen.queryByTestId('sign-message-address-own-tag')).toBeNull();
  });
});

describe('SignMessageContent dapp header', () => {
  it('shows the requesting dApp name and origin', () => {
    render(<SignMessageContent {...baseProps} />);

    expect(
      screen.getAllByText(baseProps.dapp.name as string).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(baseProps.dapp.origin)).toBeTruthy();
  });

  it('no longer renders the origin InfoRow', () => {
    render(<SignMessageContent {...baseProps} />);

    expect(screen.queryByTestId('sign-message-origin')).toBeNull();
  });

  it('shows the dapp icon image when the dapp provides one', () => {
    render(
      <SignMessageContent
        {...baseProps}
        dapp={{
          icon: { img: { uri: 'https://dapp.example/icon.png' } },
          name: 'Test DApp',
          origin: 'https://dapp.example',
        }}
      />,
    );

    const squaredAvatar = document.querySelector('[data-shape="squared"]');
    expect(squaredAvatar?.textContent).toBe('https://dapp.example/icon.png');
  });

  it('falls back to the dapp name when there is no icon image', () => {
    render(<SignMessageContent {...baseProps} />);

    const squaredAvatar = document.querySelector('[data-shape="squared"]');
    expect(squaredAvatar?.textContent).toBe('Test DApp');
  });
});

describe('SignMessageContent account row', () => {
  it('renders the account tag with the account name when accountInfo is provided', () => {
    render(<SignMessageContent {...baseProps} />);

    expect(screen.getByTestId('sign-message-account')).not.toBeNull();
    expect(
      screen.getByTestId('sign-message-account-name').textContent,
    ).toContain('Account 1');
  });

  it('omits the account row when no accountInfo is provided', () => {
    render(<SignMessageContent {...baseProps} accountInfo={undefined} />);

    expect(screen.queryByTestId('sign-message-account')).toBeNull();
    expect(screen.queryByTestId('sign-message-account-name')).toBeNull();
  });

  it('renders the account security alert for the signing account below the account row', () => {
    render(<SignMessageContent {...baseProps} />);

    expect(
      screen.getByTestId('account-security-alert-inline').textContent,
    ).toBe('account-1');
  });

  it('omits the account security alert when no accountInfo is provided', () => {
    render(<SignMessageContent {...baseProps} accountInfo={undefined} />);

    expect(screen.queryByTestId('account-security-alert-inline')).toBeNull();
  });

  it('shows the account avatar image when an avatarUri is available', () => {
    render(
      <SignMessageContent
        {...baseProps}
        accountInfo={{
          name: 'Account 1',
          avatarUri: 'https://example.com/avatar.png',
          accountId: baseProps.accountInfo!.accountId,
        }}
      />,
    );

    const roundedAvatar = document.querySelector('[data-shape="rounded"]');
    expect(roundedAvatar?.textContent).toBe('https://example.com/avatar.png');
  });

  it('derives two-letter uppercase initials from the account name as a fallback', () => {
    render(
      <SignMessageContent
        {...baseProps}
        accountInfo={{
          name: 'primary wallet',
          accountId: baseProps.accountInfo!.accountId,
        }}
      />,
    );

    const roundedAvatar = document.querySelector('[data-shape="rounded"]');
    expect(roundedAvatar?.textContent).toBe('PR');
  });
});

describe('SignMessageContent signature type', () => {
  it('shows the ECDSA label for an ecdsa signature request', () => {
    render(<SignMessageContent {...baseProps} signatureType="ecdsa" />);

    expect(
      screen.getByTestId('sign-message-signature-type-tag').textContent,
    ).toContain('dapp-connector.bitcoin.sign-message.signature-type.ecdsa');
  });

  it('shows the BIP-322 label for a bip322-simple signature request', () => {
    render(<SignMessageContent {...baseProps} signatureType="bip322-simple" />);

    expect(
      screen.getByTestId('sign-message-signature-type-tag').textContent,
    ).toContain('dapp-connector.bitcoin.sign-message.signature-type.bip322');
  });

  it('renders the signature type row after the account block', () => {
    render(<SignMessageContent {...baseProps} />);

    const account = screen.getByTestId('sign-message-account');
    const signatureType = screen.getByTestId('sign-message-signature-type');
    expect(
      account.compareDocumentPosition(signatureType) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('renders the signature type row before the address card', () => {
    render(<SignMessageContent {...baseProps} />);

    const signatureType = screen.getByTestId('sign-message-signature-type');
    const address = screen.getByTestId('sign-message-address');
    expect(
      signatureType.compareDocumentPosition(address) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
