import React, { useCallback } from 'react';
import { ADDRESS_CARD_QR_CODE_SIZE, AddressCard, HandleAddressCard } from '@lace/core';
import { useTheme } from '@providers/ThemeProvider';
import { useWalletStore } from '@src/stores';
import styles from './QRInfoWalletDrawer.module.scss';
import { useTranslation } from 'react-i18next';
import { useDrawer } from '../../stores';
import { getQRCodeOptions } from '@src/utils/qrCodeHelpers';
import { useKeyboardShortcut } from '@hooks';
import { useGetHandles } from '@hooks/useGetHandles';
import { getAssetImageUrl } from '@src/utils/get-asset-image-url';

const useWalletInformation = () =>
  useWalletStore((state) => ({
    name: state?.walletInfo?.name,
    address: state?.walletInfo?.addresses[0].address
  }));

export const QRInfoWalletDrawer = (): React.ReactElement => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { name, address } = useWalletInformation();
  const [, closeDrawer] = useDrawer();
  const handles = useGetHandles();

  useKeyboardShortcut(['Escape'], () => closeDrawer());

  return (
    <div className={styles.infoContainer}>
      <AddressCard
        name={name}
        address={address?.toString()}
        getQRCodeOptions={useCallback(() => getQRCodeOptions(theme, ADDRESS_CARD_QR_CODE_SIZE), [theme])}
        copiedMessage={t('core.infoWallet.addressCopied')}
      />
      {handles?.map(({ nftMetadata }) => (
        <HandleAddressCard
          key={nftMetadata.name}
          name={nftMetadata.name}
          image={getAssetImageUrl(nftMetadata.image)}
          copiedMessage={t('core.infoWallet.handleCopied')}
        />
      ))}
    </div>
  );
};
