/** @vitest-environment jsdom */
import type { ReactNode } from 'react';

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProofServerReviewNotice } from '../../src/components/send-flow/ProofServerReviewNotice';
import { useMidnightProofServerBannerContent } from '../../src/components/useMidnightProofServerBannerContent';

import type * as I18n from '@lace-contract/i18n';
import type { ProofServerMode } from '@lace-contract/midnight-context';

const state = vi.hoisted(() => ({ mode: {} as ProofServerMode }));
vi.mock('../../src/hooks/lace-context', () => ({
  useLaceSelector: () => ({ config: { proofServer: state.mode } }),
}));
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
vi.mock('react-native', () => ({
  StyleSheet: { create: (x: unknown) => x },
  Linking: { openURL: vi.fn() },
}));
vi.mock('@lace-lib/ui-toolkit', () => ({
  Text: {
    S: ({ children }: { children?: ReactNode }) =>
      createElement('span', {}, children),
  },
  WarningAlert: ({ title, body }: { title: string; body: string }) =>
    createElement('aside', {}, title, body),
  useTheme: () => ({ theme: { name: 'light', brand: {} } }),
}));
const Banner = () => useMidnightProofServerBannerContent().description;

afterEach(cleanup);

describe('proof-server banner', () => {
  it.each(['delegated', 'tee-delegated'] as const)(
    'explains delegated proving without naming the %s provider',
    kind => {
      state.mode = { kind, url: 'https://prover.example', label: 'Provider A' };
      const { container } = render(createElement(Banner));
      expect(
        screen.getByText(
          'You have selected delegated proof generation. Proof material will be sent outside your wallet to a third-party provider.',
        ),
      ).toBeTruthy();
      expect(container.textContent).not.toMatch(
        /Docker|mandatory|Learn how|Provider A|This transaction/,
      );
    },
  );

  it('describes Custom without promising local processing and updates when the mode changes', () => {
    state.mode = { kind: 'local-host', url: 'http://localhost:6300' };
    const { container, rerender } = render(createElement(Banner));
    expect(container.textContent).toContain(
      'Proof data is sent to the configured server. It may be processed on this device or remotely, depending on your setup. Only use a server you trust.',
    );
    expect(container.textContent).toContain('View installation guide');
    expect(container.textContent).not.toMatch(
      /mandatory|on your machine|local proof server/,
    );
    state.mode = {
      kind: 'tee-delegated',
      url: 'https://prover.example',
      label: 'Provider B',
    };
    rerender(createElement(Banner));
    expect(
      screen.getByText(
        'You have selected delegated proof generation. Proof material will be sent outside your wallet to a third-party provider.',
      ),
    ).toBeTruthy();
    expect(container.textContent).not.toContain('Docker');
  });

  it.each([
    { kind: 'in-process' },
    {
      kind: 'paired-device',
      url: 'http://paired.example',
      pairingId: 'Desktop',
    },
  ] as ProofServerMode[])('does not require Docker for $kind', mode => {
    state.mode = mode;
    const { container } = render(createElement(Banner));
    expect(container.textContent).not.toMatch(/Docker|mandatory/);
  });
});

describe('proof-server transaction review notice', () => {
  it.each(['delegated', 'tee-delegated'] as const)(
    'names the selected %s provider in a warning before confirmation',
    kind => {
      state.mode = { kind, url: 'https://prover.example', label: 'Provider A' };
      const { container, rerender } = render(
        createElement(ProofServerReviewNotice),
      );
      expect(container.querySelector('aside')?.textContent).toContain(
        'This transaction will use Provider A for remote proof generation.',
      );
      state.mode = {
        kind,
        url: 'https://another.example',
        label: 'Provider B',
      };
      rerender(createElement(ProofServerReviewNotice));
      expect(container.textContent).toContain(
        'This transaction will use Provider B',
      );
    },
  );

  it.each([
    { kind: 'in-process' },
    {
      kind: 'paired-device',
      url: 'http://paired.example',
      pairingId: 'Desktop',
    },
  ] as ProofServerMode[])(
    'does not warn about third-party proving for $kind',
    mode => {
      state.mode = mode;
      const { container, rerender } = render(
        createElement(ProofServerReviewNotice),
      );
      expect(container.textContent).not.toContain('remote proof generation');
      if (mode.kind === 'in-process') {
        expect(container.querySelector('aside')?.textContent).toContain(
          'the wallet may close unexpectedly or stop responding. If it happens, you may need to restart your browser to resolve it.',
        );
        state.mode = {
          kind: 'paired-device',
          url: 'http://paired.example',
          pairingId: 'Desktop',
        };
        rerender(createElement(ProofServerReviewNotice));
      }
      expect(container.textContent).toBe('');
    },
  );

  it('warns conditionally for an existing Custom selection without requiring settings to be opened', () => {
    state.mode = { kind: 'local-host', url: 'http://localhost:6300' };
    const { container } = render(createElement(ProofServerReviewNotice));
    expect(container.querySelector('aside')?.textContent).toContain(
      'If it processes or forwards data remotely',
    );
    expect(container.textContent).toContain('including spending keys');
    expect(container.textContent).toContain('may be shared with a third party');
  });
});
