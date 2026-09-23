/**
 * @vitest-environment jsdom
 */
import {
  createUICustomisation,
  LoadModulesProvider,
} from '@lace-lib/util-render';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import {
  createContextualUseUICustomisation,
  useUICustomisation,
} from '../../src/hooks/useUICustomisation';

import type { PortfolioBannerUICustomisation } from '../../src/types';
import type { ModuleLoader } from '@lace-contract/module';
import type { BlockchainName } from '@lace-lib/util-store';

const midnightPortfolioBannerCustomisation =
  createUICustomisation<PortfolioBannerUICustomisation>({
    key: 'midnight',
    uiCustomisationSelector: (blockchainName?: BlockchainName) =>
      blockchainName === 'Midnight',
    PortfolioBanner: () => null,
  });

const loadModules: ModuleLoader = (async () => [
  midnightPortfolioBannerCustomisation,
]) as ModuleLoader;

const withLoadModules = (children: React.ReactElement) =>
  React.createElement(LoadModulesProvider, { loadModules, children });

interface SelectorComponentProps {
  blockchainName: BlockchainName;
  onRender: (blockchainName: BlockchainName, count: number) => void;
}

const SelectorComponent = ({
  blockchainName,
  onRender,
}: SelectorComponentProps) => {
  const customisations = useUICustomisation(
    'addons.loadPortfolioBannerUICustomisations',
    blockchainName,
  );
  onRender(blockchainName, customisations.length);
  return null;
};

describe('useUICustomisation', () => {
  it('never returns the previous selector value customisation on the render where the selector changes (LW-15153)', async () => {
    const renderCounts: Array<{
      blockchainName: BlockchainName;
      count: number;
    }> = [];
    const onRender = (blockchainName: BlockchainName, count: number) => {
      renderCounts.push({ blockchainName, count });
    };

    const { rerender } = render(
      withLoadModules(
        React.createElement(SelectorComponent, {
          blockchainName: 'Midnight',
          onRender,
        }),
      ),
    );

    // Wait for the async module load to resolve and the Midnight banner to
    // actually be selected, so the switch below is a real regression, not an
    // artifact of modules never having loaded.
    await waitFor(() => {
      expect(
        renderCounts.some(
          r => r.blockchainName === 'Midnight' && r.count === 1,
        ),
      ).toBe(true);
    });

    renderCounts.length = 0;

    // rerender flushes the prop change synchronously under act, so the very
    // first Cardano render is already captured when the call returns — no
    // polling. Asserting synchronously (not via waitFor) is both race-free and
    // the precise regression: the flash is the FIRST render showing stale data,
    // so a customisation surviving even one render must fail here.
    rerender(
      withLoadModules(
        React.createElement(SelectorComponent, {
          blockchainName: 'Cardano',
          onRender,
        }),
      ),
    );

    expect(renderCounts.length).toBeGreaterThan(0);
    expect(
      renderCounts.every(r => r.blockchainName === 'Cardano' && r.count === 0),
    ).toBe(true);
  });

  it('returns all loaded customisations unfiltered when called without a selector', async () => {
    let count = -1;
    const NoSelectorComponent = () => {
      count = useUICustomisation(
        'addons.loadPortfolioBannerUICustomisations',
      ).length;
      return null;
    };

    render(withLoadModules(React.createElement(NoSelectorComponent)));

    await waitFor(() => {
      expect(count).toBe(1);
    });
  });

  it('createContextualUseUICustomisation returns a hook that filters by selector', async () => {
    const useContextual = createContextualUseUICustomisation();
    let count = -1;
    const ContextualComponent = () => {
      count = useContextual(
        'addons.loadPortfolioBannerUICustomisations',
        'Cardano',
      ).length;
      return null;
    };

    render(withLoadModules(React.createElement(ContextualComponent)));

    // Midnight-only banner must be filtered out for a Cardano selector.
    await waitFor(() => {
      expect(count).toBe(0);
    });
  });
});
