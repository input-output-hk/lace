/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SignReviewResultContent } from '../../src/components/SignReviewResultContent';

const mocks = vi.hoisted(() => ({
  setOptions: vi.fn(),
}));

vi.mock('@lace-contract/i18n', async importOriginal => ({
  ...(await importOriginal<object>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ setOptions: mocks.setOptions }),
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
    Sheet: {
      Header: () => null,
      Footer: () => null,
      Scroll: ({ children }: { children?: React.ReactNode }) => (
        <div>{children}</div>
      ),
    },
    Column: Box,
    Icon: ({ name, size }: { name: string; size?: number }) => (
      <span data-testid="icon" data-name={name} data-size={size} />
    ),
    Text: { M: TextVariant },
    spacing: { L: 16, M: 12, XXXXL: 64 },
    useTheme: () => ({ theme: { text: { primary: '#fff' } } }),
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
}));

type CapturedOptions = {
  header?: { props?: { title?: string } };
  footer?: {
    props?: {
      primaryButton?: unknown;
      secondaryButton?: { label?: string; onPress?: () => void };
    };
  };
};

const lastOptions = () =>
  mocks.setOptions.mock.calls.at(-1)?.[0] as CapturedOptions | undefined;

describe('SignReviewResultContent', () => {
  beforeEach(() => {
    mocks.setOptions.mockClear();
  });

  it('shows the success title, icon, and description', () => {
    render(
      <SignReviewResultContent
        state="success"
        descriptionKey="dapp-connector.bitcoin.sign-message.result.success.description"
        onClose={vi.fn()}
        testID="result"
      />,
    );

    expect(lastOptions()?.header?.props?.title).toBe(
      'dapp-connector.bitcoin.result.success.title',
    );
    expect(screen.getByTestId('icon').dataset.name).toBe('RelievedFace');
    expect(screen.getByTestId('result-description').textContent).toBe(
      'dapp-connector.bitcoin.sign-message.result.success.description',
    );
  });

  it('shows the failure title, icon, and description', () => {
    render(
      <SignReviewResultContent
        state="failure"
        descriptionKey="dapp-connector.bitcoin.sign-psbt.result.failure.description"
        onClose={vi.fn()}
        testID="result"
      />,
    );

    expect(lastOptions()?.header?.props?.title).toBe(
      'dapp-connector.bitcoin.result.failure.title',
    );
    expect(screen.getByTestId('icon').dataset.name).toBe('Sad');
    expect(screen.getByTestId('result-description').textContent).toBe(
      'dapp-connector.bitcoin.sign-psbt.result.failure.description',
    );
  });

  it('sets a footer with only a Close button wired to onClose', () => {
    const onClose = vi.fn();
    render(
      <SignReviewResultContent
        state="success"
        descriptionKey="dapp-connector.bitcoin.sign-message.result.success.description"
        onClose={onClose}
        testID="result"
      />,
    );

    const footer = lastOptions()?.footer?.props;
    expect(footer?.primaryButton).toBeUndefined();
    expect(footer?.secondaryButton?.label).toBe(
      'dapp-connector.bitcoin.result.close',
    );

    footer?.secondaryButton?.onPress?.();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
