/**
 * @vitest-environment jsdom
 */
import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// Real matchLoadedWallet calls WalletId.deriveFromMnemonic's blake2b hashing,
// which rejects jsdom's cross-realm Buffers (see this module's vitest.config.js).
// Unrelated to passphrase refusal anyway — already covered by its own test file.
vi.mock('@lace-contract/analytics', () => ({
  useAnalytics: () => ({ trackEvent: vi.fn() }),
}));

vi.mock('../../src/components/match-loaded-wallet', () => ({
  matchLoadedWallet: () => undefined,
}));

vi.mock('@lace-contract/i18n', async importOriginal => ({
  ...(await importOriginal<object>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Mocked as a unit rather than its transitive deps (Clipboard, Button, Row,
// bip39) so this file stays about the refusal logic.
vi.mock('../../src/components/PhraseField', () => ({
  PhraseField: ({
    testID,
    value,
    onChangeText,
    errorMessage,
  }: {
    testID: string;
    value: string;
    onChangeText: (text: string) => void;
    errorMessage?: string;
  }) => (
    <>
      <input
        data-testid={`${testID}-value`}
        value={value}
        onChange={event => {
          onChangeText(event.target.value);
        }}
      />
      {errorMessage && (
        <span data-testid={`${testID}-input-error`}>{errorMessage}</span>
      )}
    </>
  ),
}));

// Mocked as a unit: it imports react-native primitives this node-run suite
// cannot parse, and this file is about the refusal logic, not the card.
vi.mock('../../src/components/WizardOptionCard', () => ({
  WizardOptionCard: ({
    testID,
    title,
    onPress,
  }: {
    testID: string;
    title?: string;
    onPress: () => void;
  }) => (
    <button data-testid={testID} onClick={onPress}>
      {title}
    </button>
  ),
}));

vi.mock('@lace-lib/ui-toolkit', () => ({
  spacing: { L: 0, S: 0 },
  // NoteItem renders the phishing warning on this step: it reads the theme for
  // the icon colour and the dark-mode dimming.
  useTheme: () => ({ theme: { name: 'light', text: { tertiary: '#777777' } } }),
  Icon: () => null,
  Row: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Column: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Text: {
    M: ({ children }: { children?: React.ReactNode }) => (
      <span>{children}</span>
    ),
    S: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => <span data-testid={testID}>{children}</span>,
  },
  Toggle: ({
    testID,
    value,
    onValueChange,
  }: {
    testID: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
  }) => (
    <input
      type="checkbox"
      data-testid={testID}
      checked={value}
      onChange={() => {
        onValueChange(!value);
      }}
    />
  ),
}));

vi.mock('../../src/components/WizardFrame', () => ({
  WizardFrame: ({
    children,
    primaryLabel,
    onPrimary,
    primaryDisabled,
    testID,
  }: {
    children?: React.ReactNode;
    stepLabel?: string;
    stepProgress?: number;
    walletTag?: string;
    title?: string;
    primaryLabel?: string;
    onPrimary?: () => void;
    primaryDisabled?: boolean;
    backLabel?: string;
    onBack?: () => void;
    secondaryLabel?: string;
    onSecondary?: () => void;
    confirmSecondary?: boolean;
    navigationDisabled?: boolean;
    testID: string;
  }) => (
    <div>
      {children}
      <button
        data-testid={`${testID}-primary`}
        disabled={primaryDisabled}
        onClick={onPrimary}>
        {primaryLabel}
      </button>
    </div>
  ),
}));

import { SourceSeedStep } from '../../src/components/SourceSeedStep';

// A valid, unrelated 24-word BIP39 test vector — not the destination's phrase
// and not any loaded wallet's, so isPhraseValid is true and matchLoadedWallet
// returns undefined, isolating the passphrase-toggle refusal being tested.
const VALID_WORDS =
  'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo vote';

const renderStepWithPhraseEntered = (onSubmit = vi.fn()) => {
  const screen = render(
    <SourceSeedStep
      destinationWalletId={undefined}
      loadedWalletIds={[]}
      stepLabel="3"
      onCancel={vi.fn()}
      onSubmit={onSubmit}
    />,
  );
  fireEvent.change(screen.getByTestId('migrate-wallet-phrase-value'), {
    target: { value: VALID_WORDS },
  });
  return screen;
};

const isPrimaryDisabled = (screen: ReturnType<typeof render>) =>
  (screen.getByTestId('migrate-wallet-seed-step-primary') as HTMLButtonElement)
    .disabled;

describe('SourceSeedStep passphrase refusal', () => {
  it('enables submission for a valid phrase with the passphrase toggle unanswered', () => {
    const screen = renderStepWithPhraseEntered();

    expect(isPrimaryDisabled(screen)).toBe(false);
  });

  it('refuses submission and shows the not-supported error once the passphrase toggle is on', () => {
    const onSubmit = vi.fn();
    const screen = renderStepWithPhraseEntered(onSubmit);

    fireEvent.click(
      screen.getByTestId('migrate-wallet-seed-passphrase-toggle'),
    );

    expect(isPrimaryDisabled(screen)).toBe(true);
    expect(
      screen.getByTestId('migrate-wallet-seed-passphrase-error').textContent,
    ).toBe('migrate-wallet.error.passphrase-not-supported');

    fireEvent.click(screen.getByTestId('migrate-wallet-seed-step-primary'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('re-enables submission if the passphrase toggle is switched back off', () => {
    const screen = renderStepWithPhraseEntered();

    const toggle = screen.getByTestId('migrate-wallet-seed-passphrase-toggle');
    fireEvent.click(toggle);
    fireEvent.click(toggle);

    expect(isPrimaryDisabled(screen)).toBe(false);
    expect(
      screen.queryByTestId('migrate-wallet-seed-passphrase-error'),
    ).toBeNull();
  });
});
