import React from 'react';
import { Card, Flex, Text } from '@lace/ui';
import styles from './TopUpWallet.module.scss';
import { useTranslation } from 'react-i18next';
import { TopUpWalletButton } from './TopUpWalletButton';

export const TopUpWalletCard = (): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <Card.Outlined className={styles.card}>
      <Flex flexDirection="column" mx="$20" my="$20" gap="$6" alignItems="stretch">
        <div className={styles.titleBadge}>
          <Text.Label className={styles.badgeCaption} weight="$medium">
            {t('browserView.assets.topupWallet.card.badge')}
          </Text.Label>
        </div>
        <Flex my="$10">
          <Text.SubHeading weight="$bold">{t('browserView.assets.topupWallet.card.title')}</Text.SubHeading>
        </Flex>
        <Flex flexDirection="column" alignItems="stretch" gap="$16" mt="$10">
          <Text.Body.Normal weight="$medium" color="secondary">
            {t('browserView.assets.topupWallet.buyButton.title')}
          </Text.Body.Normal>
          <TopUpWalletButton />
          <Text.Label weight="$medium" className={styles.disclaimerShort}>
            {t('browserView.assets.topupWallet.disclaimer.short')}
          </Text.Label>
        </Flex>
      </Flex>
    </Card.Outlined>
  );
};
