/* eslint-disable unicorn/no-null */
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
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { Button, Flex } from '@input-output-hk/lace-ui-toolkit';
import { ExclamationCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { useLocalStorage, useNextUnusedAddress } from '@hooks';
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
  const [, closeDrawer] = useDrawer();
  const { unusedAddresses, currentUnusedAddress, generateUnusedAddress, clearUnusedAddress } = useNextUnusedAddress();
  const [isReceiveInAdvancedMode] = useLocalStorage('isReceiveInAdvancedMode', false);

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

  const isUnusedAddress = useCallback(
    (address: Wallet.Cardano.PaymentAddress) => address === unusedAddresses?.[0].address,
    [unusedAddresses]
  );

  useEffect(() => {
    if (!addresses) return;

    const _usedAddresses = addresses
      .filter(({ address }) => !isUnusedAddress(address))
      .map(({ address }) => {
        const assetsInAddress = assets && getTotalAssetsByAddress(outputs, assets, address);

        const totalLovelace = getTransactionTotalOutputByAddress(outputs, address);
        const totalAda = Wallet.util.lovelacesToAdaString(totalLovelace.toString());
        const balance = formatBalance(Number.parseFloat(totalAda));

        return {
          address,
          handles: handles.filter((handle) => handle.cardanoAddress === address).map(({ handle }) => handle),
          stakePool: rewardAccounts[0].delegatee?.currentEpoch?.metadata?.ticker,
          balance,
          tokens: {
            amount: assetsInAddress?.assets,
            nfts: assetsInAddress?.nfts
          }
        };
      });

    setUsedAddresses(_usedAddresses);
  }, [addresses, addressesWithUtxo, assets, handles, outputs, rewardAccounts, utxos, unusedAddresses, isUnusedAddress]);

  useEffect(() => {
    if (isAdvancedModeEnabled && usedAddresses?.length === 0) {
      generateUnusedAddress();
    }
  }, [isAdvancedModeEnabled, usedAddresses, generateUnusedAddress]);

  useEffect(() => {
    if (!isUnusedAddress(currentUnusedAddress) && usedAddresses?.length > 0) {
      clearUnusedAddress();
    }
  }, [currentUnusedAddress, clearUnusedAddress, isUnusedAddress, usedAddresses]);

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
            {currentUnusedAddress && (
              <AddressCard
                address={currentUnusedAddress}
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
          {currentUnusedAddress && (
            <Banner
              message={translations.newAddressBannerText}
              customIcon={<ExclamationCircleOutlined className={styles.addNewAddressBannerIcon} />}
              withIcon
              className={styles.addNewAddressBanner}
            />
          )}
          <Button.Secondary
            disabled={!!currentUnusedAddress}
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
