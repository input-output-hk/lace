/* eslint-disable unicorn/no-null, consistent-return */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ADDRESS_CARD_QR_CODE_SIZE, AddressCard, HandleAddressCard } from '@lace/core';
import { useTheme } from '@providers/ThemeProvider';
import { useWalletStore } from '@src/stores';
import styles from './QRInfoWalletDrawer.module.scss';
import { Trans, useTranslation } from 'react-i18next';
import { useDrawer } from '../../stores';
import { getQRCodeOptions } from '@src/utils/qrCodeHelpers';
import { Banner, useKeyboardShortcut, useObservable } from '@lace/common';
import { getAssetImageUrl } from '@src/utils/get-asset-image-url';
import { useAnalyticsContext, useAppSettingsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { Button, Flex } from '@input-output-hk/lace-ui-toolkit';
import { ExclamationCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { useChainHistoryProvider, useLocalStorage } from '@hooks';
import { Divider } from 'antd';
import { Wallet } from '@lace/cardano';
import { getTransactionTotalOutputByAddress } from '@src/utils/get-transaction-total-output';
import { getTotalAssetsByAddress } from '@src/utils/assets-transformers';
import { formatBalance } from '@src/utils/format-number';

type WalletData = {
  address: Wallet.Cardano.PaymentAddress;
  handles?: string[];
  stakePool?: string;
  balance?: string;
  tokens?: {
    amount: number;
    nfts?: number;
  };
};

const useAdvancedReceived = process.env.USE_ADVANCED_RECEIVED === 'true';

/**
 * Gets whether the given address has a transaction history.
 *
 * @param address The address to query.
 * @param chainHistoryProvider The chain history provider where to fetch the history from.
 */
const addressHasTx = async (
  address: Wallet.Cardano.PaymentAddress,
  chainHistoryProvider: Wallet.ChainHistoryProvider
): Promise<boolean> => {
  const txs = await chainHistoryProvider.transactionsByAddresses({
    addresses: [address],
    pagination: {
      limit: 1,
      startAt: 0
    }
  });

  return txs.totalResultCount > 0;
};

/**
 * Gets the last known unused address from the tracked addresses.
 *
 * @param knownAddresses The known addresses.
 * @param chainHistoryProvider The chain history provider where to fetch the history from.
 */
const getCurrentUnusedAddress = async (
  knownAddresses: Wallet.WalletAddress[],
  chainHistoryProvider: Wallet.ChainHistoryProvider
): Promise<Wallet.WalletAddress | undefined> => {
  if (!knownAddresses || knownAddresses.length === 0) return undefined;

  if (Wallet.isScriptAddress(knownAddresses[0])) return undefined;

  const sortedAddresses: Wallet.KeyManagement.GroupedAddress[] = [...knownAddresses]
    .filter((addr): addr is Wallet.KeyManagement.GroupedAddress => Wallet.isKeyHashAddress(addr))
    .sort((a, b) => b.index - a.index);

  const latestAddress = sortedAddresses[0];

  const isEmpty = !(await addressHasTx(latestAddress.address, chainHistoryProvider));

  if (isEmpty) return latestAddress;

  return undefined;
};

const useWalletInformation = () =>
  useWalletStore((state) => ({
    name: state?.walletInfo?.name,
    handles: state?.walletState?.handles,
    utxos: state?.walletState?.utxo.total,
    rewardAccounts: state?.walletState?.delegation.rewardAccounts
  }));

export const QRInfoWalletDrawer = (): React.ReactElement => {
  const analytics = useAnalyticsContext();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { name, handles, utxos, rewardAccounts } = useWalletInformation();
  const [usedAddresses, setUsedAddresses] = useState<WalletData[]>();
  const [unusedAddress, setUnusedAddress] = useState<Wallet.Cardano.PaymentAddress | undefined>();
  const [currentUnusedAddress, setCurrentUnusedAddress] = useState<Wallet.Cardano.PaymentAddress | undefined>();
  const [, closeDrawer] = useDrawer();
  const [isReceiveInAdvancedMode] = useLocalStorage('isReceiveInAdvancedMode', false);
  const [{ chainName }] = useAppSettingsContext();
  const chainHistoryProvider = useChainHistoryProvider({ chainName });

  useKeyboardShortcut(['Escape'], () => closeDrawer());

  const handleCopyAdaHandle = () => {
    analytics.sendEventToPostHog(PostHogAction.ReceiveCopyADAHandleIconClick);
  };

  const handleCopyAddress = () => {
    analytics.sendEventToPostHog(PostHogAction.ReceiveCopyAddressIconClick);
  };

  const getQRCodeOpts = useCallback(() => getQRCodeOptions(theme, ADDRESS_CARD_QR_CODE_SIZE), [theme]);

  const translations = {
    additionalAddressesTitle: t('qrInfo.advancedMode.additionalAddresses.title'),
    addNewAddressBtn: t('qrInfo.advancedMode.newAddress.button'),
    mainAddressTag: t('qrInfo.advancedMode.tags.main'),
    newAddressTag: t('qrInfo.advancedMode.tags.unused'),
    newAddressBannerText: t('qrInfo.advancedMode.newAddress.warning')
  };

  const isAdvancedModeEnabled = useAdvancedReceived && isReceiveInAdvancedMode;

  const { inMemoryWallet } = useWalletStore();
  const addresses = useObservable(inMemoryWallet.addresses$);
  const assets = useObservable(inMemoryWallet.assetInfo$);

  const { addressesWithUtxo, outputs } = useMemo(() => {
    const _addressesWithUtxo = utxos?.map((utxo) => utxo[0]);
    const _outputs = utxos?.map((utxo) => utxo[1]);

    return { addressesWithUtxo: _addressesWithUtxo, outputs: _outputs };
  }, [utxos]);

  const generateUnusedAddress = useCallback(async () => {
    const unused = await inMemoryWallet.getNextUnusedAddress();
    setUnusedAddress(unused[0].address);
  }, [inMemoryWallet, setUnusedAddress]);

  useEffect(() => {
    const fetchAddress = async () => {
      const address = await getCurrentUnusedAddress(addresses, chainHistoryProvider);
      setCurrentUnusedAddress(address?.address);
    };

    fetchAddress();
  }, [addresses, chainHistoryProvider, utxos]);

  useEffect(() => {
    if (!addresses) return;

    const _usedAddresses = addresses
      .filter(({ address }) => address !== currentUnusedAddress)
      .map(({ address, rewardAccount }) => {
        const assetsInAddress = assets && getTotalAssetsByAddress(outputs, assets, address);

        const totalLovelace = getTransactionTotalOutputByAddress(outputs, address);
        const totalAda = Wallet.util.lovelacesToAdaString(totalLovelace.toString());
        const balance = formatBalance(Number.parseFloat(totalAda));
        const addressRewardAccount = rewardAccounts.find((acct) => acct.address === rewardAccount);
        const mostRecentMetadata = addressRewardAccount?.delegatee?.nextNextEpoch;

        return {
          address,
          handles: handles.filter((handle) => handle.cardanoAddress === address).map(({ handle }) => handle),
          stakePool: mostRecentMetadata?.metadata?.ticker,
          balance,
          tokens: {
            amount: assetsInAddress?.assets,
            nfts: assetsInAddress?.nfts
          }
        };
      });

    setUsedAddresses(_usedAddresses);
    setUnusedAddress(currentUnusedAddress);
  }, [
    addresses,
    addressesWithUtxo,
    assets,
    handles,
    outputs,
    rewardAccounts,
    utxos,
    unusedAddress,
    setUnusedAddress,
    currentUnusedAddress
  ]);

  useEffect(() => {
    if (isAdvancedModeEnabled && usedAddresses?.length === 0) {
      generateUnusedAddress();
    }
  }, [isAdvancedModeEnabled, usedAddresses, generateUnusedAddress]);

  const isAdditionalAddressesVisible = useMemo(
    () => usedAddresses?.length > 1 || (usedAddresses?.length > 0 && currentUnusedAddress),
    [currentUnusedAddress, usedAddresses]
  );

  return (
    <Flex flexDirection="column" justifyContent="space-between" alignItems="center">
      <div className={styles.infoContainer}>
        {!isAdvancedModeEnabled && addresses && (
          <Flex flexDirection="column" gap="$16">
            <AddressCard
              name={name}
              address={addresses[0].address}
              getQRCodeOptions={getQRCodeOpts}
              onCopyClick={handleCopyAddress}
            />
            {handles?.map(({ nftMetadata, image }) => (
              <HandleAddressCard
                key={nftMetadata.name}
                name={nftMetadata.name}
                image={getAssetImageUrl(image || nftMetadata.image)}
                copiedMessage={t('core.infoWallet.handleCopied')}
                onCopyClick={handleCopyAdaHandle}
              />
            ))}
          </Flex>
        )}
        {isAdvancedModeEnabled && (
          <>
            {usedAddresses?.length > 0 && (
              <AddressCard
                address={usedAddresses[0].address}
                getQRCodeOptions={getQRCodeOpts}
                onCopyClick={handleCopyAddress}
                tagWith={{ label: translations.mainAddressTag }}
                metadata={{
                  handles: usedAddresses[0].handles,
                  balance: usedAddresses[0].balance,
                  tokens: {
                    amount: usedAddresses[0].tokens.amount,
                    nfts: usedAddresses[0].tokens.nfts
                  },
                  stakePool: usedAddresses[0].stakePool
                }}
              />
            )}
            {isAdditionalAddressesVisible && (
              <Divider orientation="center">{translations.additionalAddressesTitle}</Divider>
            )}
            {usedAddresses?.length > 1 && (
              <>
                {usedAddresses.slice(1).map(({ address, handles: adaHandles, balance, tokens, stakePool }) => (
                  <AddressCard
                    key={address}
                    address={address}
                    getQRCodeOptions={getQRCodeOpts}
                    onCopyClick={handleCopyAddress}
                    metadata={{
                      handles: adaHandles,
                      balance,
                      tokens,
                      stakePool
                    }}
                  />
                ))}
              </>
            )}
            {unusedAddress && (
              <AddressCard
                address={unusedAddress}
                getQRCodeOptions={getQRCodeOpts}
                onCopyClick={handleCopyAddress}
                highlighted
                isUnused
                tagWith={{
                  label: translations.newAddressTag,
                  tooltip: (
                    <Trans
                      i18nKey="qrInfo.advancedMode.newAddress.description"
                      components={{
                        pt: <p />,
                        pb: <p />
                      }}
                    />
                  )
                }}
              />
            )}
          </>
        )}
      </div>
      {isAdvancedModeEnabled && (
        <Flex w="$fill" mb="$16" gap="$16" flexDirection="column" className={styles.addNewAddressContainer}>
          {unusedAddress && (
            <Banner
              message={translations.newAddressBannerText}
              customIcon={<ExclamationCircleOutlined className={styles.addNewAddressBannerIcon} />}
              withIcon
              className={styles.addNewAddressBanner}
            />
          )}
          <Button.Secondary
            disabled={!!unusedAddress}
            w="$fill"
            icon={<PlusCircleOutlined />}
            onClick={generateUnusedAddress}
            label={translations.addNewAddressBtn}
          />
        </Flex>
      )}
    </Flex>
  );
};
