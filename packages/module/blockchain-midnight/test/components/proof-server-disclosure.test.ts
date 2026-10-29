/** @vitest-environment jsdom */
import type { ReactNode } from 'react';

import { cleanup, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MidnightSettingsSheet } from '../../src/customisations/settings/MidnightSettingsSheet';

import type * as I18n from '@lace-contract/i18n';

const state = vi.hoisted(() => ({ isFirstUse: true, isCustom: false }));
vi.mock('@lace-contract/i18n', async importOriginal => {
  const actual = await importOriginal<typeof I18n>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (
        key: keyof typeof actual.rawTranslations.en,
        values?: { provider: string },
      ) =>
        actual.rawTranslations.en[key].replace(
          '{{provider}}',
          values?.provider ?? '',
        ),
    }),
  };
});
vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: { closeSheet: vi.fn() },
}));
vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ setOptions: vi.fn() }),
}));
vi.mock('react-native', () => ({ StyleSheet: { create: (x: unknown) => x } }));
vi.mock('@lace-lib/ui-toolkit', () => {
  const container = ({ children }: { children?: ReactNode }) =>
    createElement('div', {}, children);
  return {
    Column: container,
    Row: container,
    Text: { S: container, XS: container },
    RadioButton: container,
    Sheet: { Scroll: container, Header: container, Footer: container },
    spacing: {},
    useTheme: () => ({ theme: { text: { secondary: '' } } }),
    WarningAlert: ({ title, body }: { title: string; body: string }) =>
      createElement('aside', { 'data-testid': 'warning' }, title, body),
  };
});
vi.mock('../../src/hooks/useMidnightSettings', () => ({
  useMidnightSettings: () => ({
    networkId: 'preprod',
    networksConfig: {
      preprod: {
        proofServer: state.isCustom
          ? {
              kind: 'local-host',
              url: 'http://localhost:6300',
            }
          : {
              kind: 'tee-delegated',
              label: 'Temenos',
              url: 'https://api.proofserver.wastedp.io',
            },
      },
    },
    isOpen: true,
    isSaving: false,
    openSettings: vi.fn(),
    save: vi.fn(),
    getProofServerSections: () => [],
  }),
}));
vi.mock('../../src/hooks/useProofServerConfirmation', () => ({
  useProofServerConfirmation: () => ({
    confirmation: {
      provider: 'Temenos',
      isFirstUse: state.isFirstUse,
      isCustom: state.isCustom,
    },
    requestSave: vi.fn(),
    confirm: vi.fn(),
    cancel: vi.fn(),
  }),
}));

beforeEach(() => {
  state.isFirstUse = true;
  state.isCustom = false;
});
afterEach(cleanup);

describe('proof-server disclosure presentation', () => {
  it('warns on first use and labels the endpoint outside the warning', () => {
    render(createElement(MidnightSettingsSheet));
    const warning = screen.getByTestId('warning');
    expect(warning.textContent).toContain('including spending keys');
    expect(warning.textContent).toContain('Lace does not guarantee');
    expect(within(warning).queryByText('Proof server address')).toBeNull();
    expect(warning.textContent).not.toContain('https://');
    expect(screen.getByText('Proof server address')).toBeTruthy();
    expect(screen.getByText('https://api.proofserver.wastedp.io')).toBeTruthy();
  });

  it('keeps repeat confirmation plain, with the same labeled endpoint', () => {
    state.isFirstUse = false;
    render(createElement(MidnightSettingsSheet));
    expect(screen.queryByTestId('warning')).toBeNull();
    expect(screen.getByText(/Proofs will use Temenos/)).toBeTruthy();
    expect(screen.getByText('Proof server address')).toBeTruthy();
    expect(screen.getByText('https://api.proofserver.wastedp.io')).toBeTruthy();
  });

  it.each([true, false])(
    'makes remote sharing conditional for Custom (first use: %s)',
    isFirstUse => {
      state.isCustom = true;
      state.isFirstUse = isFirstUse;
      render(createElement(MidnightSettingsSheet));
      expect(
        screen.getByText(/If it processes or forwards/).textContent,
      ).toContain('may be shared with a third party');
      expect(screen.getByText(/including spending keys/)).toBeTruthy();
      expect(screen.getByText('http://localhost:6300')).toBeTruthy();
      expect(
        screen.queryByText(/Using Temenos|Proofs will use Temenos/),
      ).toBeNull();
      if (isFirstUse) {
        expect(screen.getByTestId('warning').textContent).toContain(
          'Lace does not guarantee',
        );
        expect(screen.getByTestId('warning').textContent).not.toContain(
          'http://',
        );
      } else {
        expect(screen.queryByTestId('warning')).toBeNull();
      }
    },
  );
});
