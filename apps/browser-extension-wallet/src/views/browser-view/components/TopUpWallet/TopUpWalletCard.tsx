import React from 'react';
import { Card, Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import styles from './TopUpWallet.module.scss';
import { useTranslation } from 'react-i18next';
import { TopUpWalletButton } from './TopUpWalletButton';
import { useCurrentBlockchain } from '@src/multichain';

export const TopUpWalletCard = (): React.ReactElement => {
  const { t } = useTranslation();
  const { blockchain } = useCurrentBlockchain();
  const isBitcoin = blockchain === 'bitcoin';

  return (
    <Card.Outlined className={styles.card} data-testid="top-up-wallet-card">
      <Flex flexDirection="column" mx="$20" my="$20" gap="$6" alignItems="stretch">
        <div className={styles.titleBadge} data-testid="top-up-wallet-card-badge">
          <Text.Label className={styles.badgeCaption} weight="$medium">
            {t('browserView.assets.topupWallet.card.badge')}
          </Text.Label>
        </div>
        <Flex my="$10">
          <Text.SubHeading weight="$bold" data-testid="top-up-wallet-card-title">
            {t('browserView.assets.topupWallet.card.title')}
          </Text.SubHeading>
        </Flex>
        <Flex flexDirection="column" alignItems="stretch" gap="$16" mt="$10">
          <Text.Body.Normal weight="$medium" color="secondary" data-testid="top-up-wallet-card-subtitle">
            {!isBitcoin
              ? t('browserView.assets.topupWallet.buyButton.title')
              : t('browserView.assets.topupWallet.buyButtonBtc.title')}
          </Text.Body.Normal>
          <TopUpWalletButton />
          <Text.Label weight="$medium" className={styles.disclaimerShort} data-testid="top-up-wallet-card-disclaimer">
            {!isBitcoin
              ? t('browserView.assets.topupWallet.disclaimer.short')
              : t('browserView.assets.topupWallet.disclaimer.shortBtc')}
          </Text.Label>
        </Flex>
      </Flex>
    </Card.Outlined>
  );
};
