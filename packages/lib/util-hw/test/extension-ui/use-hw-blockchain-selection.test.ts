/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useHwBlockchainSelection } from '../../src/extension-ui/use-hw-blockchain-selection';
import { HardwareIntegrationId } from '../../src/value-objects/hardware-integration-id.vo';

import type { HwBlockchainChoice } from '../../src/extension-ui/use-hw-blockchain-selection';
import type { BlockchainName } from '@lace-lib/util-store';

type Context = { label: string };

const cardanoChoice: HwBlockchainChoice = {
  blockchainName: 'Cardano' as BlockchainName,
  optionId: HardwareIntegrationId('cardano-option'),
};

const bitcoinChoice: HwBlockchainChoice = {
  blockchainName: 'Bitcoin' as BlockchainName,
  optionId: HardwareIntegrationId('bitcoin-option'),
};

const context: Context = { label: 'test-context' };

const renderSelection = () => {
  const onProceed = vi.fn();
  const rendered = renderHook(() =>
    useHwBlockchainSelection<Context>({ onProceed }),
  );
  return { onProceed, ...rendered };
};

describe('useHwBlockchainSelection', () => {
  describe('chooseBlockchainOrProceed', () => {
    it('ignores an empty blockchain list without proceeding or guessing', () => {
      const { onProceed, result } = renderSelection();

      act(() => {
        result.current.chooseBlockchainOrProceed({ blockchains: [], context });
      });

      expect(onProceed).not.toHaveBeenCalled();
      expect(result.current.isSelectingBlockchain).toBe(false);
    });

    it('ignores the deprecated fallbackOptionId instead of proceeding with it', () => {
      const { onProceed, result } = renderSelection();

      act(() => {
        result.current.chooseBlockchainOrProceed({
          blockchains: [],
          fallbackOptionId: cardanoChoice.optionId,
          context,
        });
      });

      expect(onProceed).not.toHaveBeenCalled();
      expect(result.current.isSelectingBlockchain).toBe(false);
    });

    it('proceeds directly with the single supported blockchain', () => {
      const { onProceed, result } = renderSelection();

      act(() => {
        result.current.chooseBlockchainOrProceed({
          blockchains: [bitcoinChoice],
          context,
        });
      });

      expect(onProceed).toHaveBeenCalledWith({
        optionId: bitcoinChoice.optionId,
        blockchainName: bitcoinChoice.blockchainName,
        context,
      });
      expect(result.current.isSelectingBlockchain).toBe(false);
    });

    it('switches to blockchain-selection mode when several are supported', () => {
      const { onProceed, result } = renderSelection();

      act(() => {
        result.current.chooseBlockchainOrProceed({
          blockchains: [cardanoChoice, bitcoinChoice],
          context,
        });
      });

      expect(onProceed).not.toHaveBeenCalled();
      expect(result.current.isSelectingBlockchain).toBe(true);
      expect(result.current.blockchainDevices).toEqual([
        {
          id: cardanoChoice.optionId,
          name: 'Cardano',
          models: ['Cardano'],
          logo: 'Cardano',
        },
        {
          id: bitcoinChoice.optionId,
          name: 'Bitcoin',
          models: ['Bitcoin'],
          logo: 'Bitcoin',
        },
      ]);
    });
  });

  describe('handleSelectBlockchain', () => {
    it('proceeds with the chosen blockchain and clears the selection', () => {
      const { onProceed, result } = renderSelection();

      act(() => {
        result.current.chooseBlockchainOrProceed({
          blockchains: [cardanoChoice, bitcoinChoice],
          context,
        });
      });
      act(() => {
        result.current.handleSelectBlockchain(bitcoinChoice.optionId);
      });

      expect(onProceed).toHaveBeenCalledWith({
        optionId: bitcoinChoice.optionId,
        blockchainName: bitcoinChoice.blockchainName,
        context,
      });
      expect(result.current.isSelectingBlockchain).toBe(false);
    });

    it('ignores unknown option ids', () => {
      const { onProceed, result } = renderSelection();

      act(() => {
        result.current.chooseBlockchainOrProceed({
          blockchains: [cardanoChoice, bitcoinChoice],
          context,
        });
      });
      act(() => {
        result.current.handleSelectBlockchain('unknown-option');
      });

      expect(onProceed).not.toHaveBeenCalled();
      expect(result.current.isSelectingBlockchain).toBe(true);
    });

    it('does nothing when no selection is in progress', () => {
      const { onProceed, result } = renderSelection();

      act(() => {
        result.current.handleSelectBlockchain(cardanoChoice.optionId);
      });

      expect(onProceed).not.toHaveBeenCalled();
    });
  });

  describe('resetBlockchainSelection', () => {
    it('leaves blockchain-selection mode without proceeding', () => {
      const { onProceed, result } = renderSelection();

      act(() => {
        result.current.chooseBlockchainOrProceed({
          blockchains: [cardanoChoice, bitcoinChoice],
          context,
        });
      });
      act(() => {
        result.current.resetBlockchainSelection();
      });

      expect(onProceed).not.toHaveBeenCalled();
      expect(result.current.isSelectingBlockchain).toBe(false);
      expect(result.current.blockchainDevices).toEqual([]);
    });
  });
});
