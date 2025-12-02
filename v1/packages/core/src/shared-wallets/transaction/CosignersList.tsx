import { Box, Flex, ProfilePicture } from '@input-output-hk/lace-ui-toolkit';
import { Wallet } from '@lace/cardano';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as StakeRegistrationDelegationIcon } from '../../ui/assets/icons/badge-check-outline-green.component.svg';
import styles from './CosignersList.module.scss';
import { CoSignersListItem } from './types';

interface CoSignerItemProps {
  list: CoSignersListItem[];
  ownSharedKey?: Wallet.Crypto.Bip32PublicKeyHex;
  title: string;
}

export const CosignersList = ({ list, title, ownSharedKey }: CoSignerItemProps) => {
  const { t } = useTranslation();
  const ownSharedKeyInCip5 =
    ownSharedKey && Wallet.Cardano.Cip1854ExtendedAccountPublicKey.fromBip32PublicKeyHex(ownSharedKey);
  const listWithCip5Keys = list.map((item) => ({
    ...item,
    sharedWalletKey: Wallet.Cardano.Cip1854ExtendedAccountPublicKey.fromBip32PublicKeyHex(item.sharedWalletKey),
  }));

  return (
    <Box testId="cosigner-list" mt="$24">
      <div>
        <div data-testid="cosigner-list-header" className={styles.cosignersListHeader}>
          {title}
        </div>
        {listWithCip5Keys.map(({ sharedWalletKey, name: cosignerName, signed }) => (
          <Flex
            py="$0"
            px="$24"
            mt="$8"
            h="$80"
            data-testid="cosigner-list-item"
            key={sharedWalletKey}
            className={styles.cosignersListItem}
          >
            <Flex h="$fill" gap="$16" alignItems="center" className={styles.cosignersListItemContainer}>
              <div className={styles.cosignersListItemAvatar}>
                <ProfilePicture.UserProfile
                  imageSrc=""
                  fallbackText={cosignerName?.slice(0, 1).toUpperCase() ?? ''}
                  delayMs={0}
                  data-testid="cosigner-list-item-profile-icon"
                  testId="cosigner-list-item-profile-icon"
                />
              </div>
              <div className={styles.cosignersListItemContent}>
                <Box w="$fill" className={styles.cosignersListItemName}>
                  {sharedWalletKey === ownSharedKeyInCip5
                    ? t('sharedWallets.transaction.cosignerList.you')
                    : cosignerName ?? '...'}
                </Box>
                <Box w="$fill" className={styles.cosignersListItemAddress}>
                  {sharedWalletKey}
                </Box>
              </div>
              {signed && (
                <Flex
                  pr="$12"
                  pl="$32"
                  gap="$6"
                  ml="$8"
                  h="$fill"
                  justifyContent="center"
                  alignItems="center"
                  className={styles.cosignersBadge}
                >
                  <StakeRegistrationDelegationIcon />
                  <span>{t('sharedWallets.transaction.cosignerList.signed')}</span>
                </Flex>
              )}
            </Flex>
          </Flex>
        ))}
      </div>
    </Box>
  );
};
