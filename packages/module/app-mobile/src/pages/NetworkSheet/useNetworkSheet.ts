import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type {
  BlockchainNetworkId,
  BlockchainTestnetOptions,
  NetworkSliceState,
  NetworkType,
} from '@lace-contract/network';
import type { BlockchainTestnetGroup } from '@lace-lib/ui-toolkit';
import type { BlockchainName } from '@lace-lib/util-store';

type BlockchainNetworksState = NetworkSliceState['blockchainNetworks'];

const buildInitialTestnetSelection = (
  testnetOptions: BlockchainTestnetOptions[] | undefined,
  blockchainNetworks: BlockchainNetworksState | undefined,
): Partial<Record<BlockchainName, BlockchainNetworkId>> => {
  if (!Array.isArray(testnetOptions)) return {};

  const initialSelection: Partial<Record<BlockchainName, BlockchainNetworkId>> =
    {};

  for (const { blockchainName, options } of testnetOptions) {
    if (!options.length) continue;

    initialSelection[blockchainName] =
      blockchainNetworks?.[blockchainName]?.testnet ?? options[0].id;
  }

  return initialSelection;
};

export const useNetworkSheet = () => {
  const { t } = useTranslation();
  const setNetworkType = useDispatchLaceAction('network.setNetworkType');
  const setBlockchainNetworks = useDispatchLaceAction(
    'network.setBlockchainNetworks',
  );
  const currentNetworkType = useLaceSelector('network.selectNetworkType');
  const blockchainNetworks = useLaceSelector(
    'network.selectBlockchainNetworks',
  );
  const { trackEvent } = useAnalytics();
  const testnetOptions = useLaceSelector('network.selectAllTestnetOptions');

  const blockchainTestnetGroups: BlockchainTestnetGroup[] = useMemo(() => {
    if (!Array.isArray(testnetOptions)) return [];

    return testnetOptions
      .filter(({ options }) => options.length > 0)
      .map(({ blockchainName, options }) => ({
        blockchainName,
        networks: options.map(testnet => ({
          value: testnet.id,
          label: t(testnet.label),
        })),
      }));
  }, [testnetOptions, t]);

  const [networkTypeValue, setNetworkTypeValue] = useState<string>(
    currentNetworkType ?? 'testnet',
  );

  const [selectedTestnets, setSelectedTestnets] = useState<
    Partial<Record<BlockchainName, BlockchainNetworkId>>
  >({});

  const initialTestnetSelection = useMemo(() => {
    if (!Array.isArray(testnetOptions)) return {};

    return buildInitialTestnetSelection(testnetOptions, blockchainNetworks);
  }, [testnetOptions, blockchainNetworks]);

  useEffect(() => {
    if (currentNetworkType) setNetworkTypeValue(currentNetworkType);
  }, [currentNetworkType]);

  useEffect(() => {
    setSelectedTestnets(initialTestnetSelection);
  }, [initialTestnetSelection]);

  const handleNetworkTypeChange = useCallback(
    (value: string) => {
      trackEvent('network selection | network type | press', {
        network: value,
      });
      setNetworkTypeValue(value);
    },
    [trackEvent],
  );

  const handleTestnetChange = useCallback(
    (blockchainName: string, value: string) => {
      trackEvent('testnet selection | testnet | press', {
        blockchainName,
        network: value,
      });
      setSelectedTestnets(previous => ({
        ...previous,
        [blockchainName as BlockchainName]: value as BlockchainNetworkId,
      }));
    },
    [testnetOptions, trackEvent],
  );

  const handleCancel = useCallback(() => {
    trackEvent('network selection | cancel | press');
    NavigationControls.sheets.close();
  }, [trackEvent]);

  const handleConfirm = useCallback(() => {
    trackEvent('network selection | confirm | press');
    if (networkTypeValue !== currentNetworkType) {
      setNetworkType(networkTypeValue as NetworkType);
    }

    // Persist selected testnets by updating blockchainNetworks
    for (const [blockchain, testnetId] of Object.entries(selectedTestnets)) {
      const existingConfig = blockchainNetworks?.[blockchain as BlockchainName];
      if (existingConfig) {
        setBlockchainNetworks({
          blockchain: blockchain as BlockchainName,
          mainnet: existingConfig.mainnet,
          testnet: testnetId,
        });
      }
    }

    NavigationControls.sheets.close();
  }, [
    networkTypeValue,
    currentNetworkType,
    setNetworkType,
    setBlockchainNetworks,
    blockchainNetworks,
    selectedTestnets,
    trackEvent,
  ]);

  return {
    title: t('v2.sheets.network-selection.title'),
    description: t('v2.sheets.network-selection.description'),
    networkTypeOptions: [
      { label: t('v2.sheets.network-selection.mainnet'), value: 'mainnet' },
      { label: t('v2.sheets.network-selection.testnet'), value: 'testnet' },
    ],
    networkTypeValue,
    onNetworkTypeChange: handleNetworkTypeChange,
    blockchainTestnetGroups,
    selectedTestnetsByBlockchain: selectedTestnets as Record<string, string>,
    onTestnetChange: handleTestnetChange,
    onClose: handleCancel,
    onConfirm: handleConfirm,
    cancelLabel: t('v2.sheets.network-selection.cancel'),
    confirmLabel: t('v2.sheets.network-selection.confirm'),
  };
};
