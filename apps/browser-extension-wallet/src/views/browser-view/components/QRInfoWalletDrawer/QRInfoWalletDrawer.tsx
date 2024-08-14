import React, { useCallback, useMemo } from 'react';
import { ADDRESS_CARD_QR_CODE_SIZE, AddressCard, HandleAddressCard } from '@lace/core';
import { useTheme } from '@providers/ThemeProvider';
import { useWalletStore } from '@src/stores';
import styles from './QRInfoWalletDrawer.module.scss';
import { useTranslation } from 'react-i18next';
import { useDrawer } from '../../stores';
import { getQRCodeOptions } from '@src/utils/qrCodeHelpers';
import { useKeyboardShortcut } from '@lace/common';
import { useGetHandles } from '@hooks/useGetHandles';
import { getAssetImageUrl } from '@src/utils/get-asset-image-url';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { Button, Flex } from '@input-output-hk/lace-ui-toolkit';
import { PlusOutlined } from '@ant-design/icons';
import { isUsedAddress } from '@src/utils/is-used-addresses';
import { useNextUnusedAddress } from '@hooks';

const useGlacierDrop = Boolean(process.env.USER_GLACIER_DROP);

const useWalletInformation = () =>
  useWalletStore((state) => ({
    name: state?.walletInfo?.name,
    addresses: state?.walletInfo?.addresses
  }));

const useTransactionHistory = () =>
  useWalletStore((state) => ({
    transactionHistory: state?.walletState?.transactions.history
  }));

const addressCopiedTranslation = 'core.infoWallet.addressCopied';

export const QRInfoWalletDrawer = (): React.ReactElement => {
  const analytics = useAnalyticsContext();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { name, addresses } = useWalletInformation();

  const { transactionHistory } = useTransactionHistory();
  const [, closeDrawer] = useDrawer();
  const handles = useGetHandles();
  const nextUnusedAddress = useNextUnusedAddress();

  useKeyboardShortcut(['Escape'], () => closeDrawer());

  const handleCopyAdaHandle = () => {
    analytics.sendEventToPostHog(PostHogAction.ReceiveCopyADAHandleIconClick);
  };

  const handleCopyAddress = () => {
    analytics.sendEventToPostHog(PostHogAction.ReceiveCopyAddressIconClick);
  };

  const usedAddresses = useMemo(
    () => addresses.filter((addr) => isUsedAddress(addr.address, transactionHistory)),
    [addresses, transactionHistory]
  );

  const getQRCodeOpts = useCallback(() => getQRCodeOptions(theme, ADDRESS_CARD_QR_CODE_SIZE), [theme]);

  return (
    <Flex flexDirection="column" justifyContent="space-between" alignItems="center">
      <div className={styles.infoContainer}>
        {!useGlacierDrop ? (
          <AddressCard
            name={name}
            address={addresses[0]?.toString()}
            getQRCodeOptions={getQRCodeOpts}
            copiedMessage={t(addressCopiedTranslation)}
            onCopyClick={handleCopyAddress}
          />
        ) : (
          <>
            {usedAddresses.map((addr, i) => (
              <AddressCard
                key={addr.accountIndex}
                name={i === 0 ? name : `Index ${i}`}
                address={addr.address}
                getQRCodeOptions={getQRCodeOpts}
                copiedMessage={t(addressCopiedTranslation)}
                onCopyClick={handleCopyAddress}
              />
            ))}
            {nextUnusedAddress && (
              <AddressCard
                name={'Next Unused Address'}
                address={nextUnusedAddress}
                getQRCodeOptions={getQRCodeOpts}
                copiedMessage={t(addressCopiedTranslation)}
                onCopyClick={handleCopyAddress}
              />
            )}
          </>
        )}
        {handles?.map(({ nftMetadata, image }) => (
          <HandleAddressCard
            key={nftMetadata.name}
            name={nftMetadata.name}
            image={getAssetImageUrl(image || nftMetadata.image)}
            copiedMessage={t('core.infoWallet.handleCopied')}
            onCopyClick={handleCopyAdaHandle}
          />
        ))}
      </div>
      {/* TODO: onClick to generate visible unused address, translation */}
      {useGlacierDrop && <Button.Secondary icon={<PlusOutlined />} onClick={() => void 0} label="Create new address" />}
    </Flex>
  );
};
