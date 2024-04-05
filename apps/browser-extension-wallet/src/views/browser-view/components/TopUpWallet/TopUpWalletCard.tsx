import React from 'react';
import { Card, Flex, Text } from '@lace/ui';
import styles from './TopUpWallet.module.scss';
import { useTranslation } from 'react-i18next';
import { TopUpWalletButtonConfirmation } from './TopUpWalletButtonConfirmation';
import { PostHogAction } from '@lace/common';

export const TopUpWalletCard = (): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <Card.Outlined>
      <Flex flexDirection="column" justifyContent="flex-start" alignItems="stretch" mx="$20" my="$32" gap="$20">
        <Flex gap="$8" alignItems="center">
          <Text.SubHeading weight="$bold">{t('browserView.assets.topupWallet.card.title')}</Text.SubHeading>
          <div className={styles.titleBadge}>
            <Text.Label className={styles.badgeCaption} weight="$medium">
              {t('browserView.assets.topupWallet.card.badge')}
            </Text.Label>
          </div>
        </Flex>
        <Text.Body.Normal weight="$medium">{t('browserView.assets.topupWallet.card.content')}</Text.Body.Normal>
        <Flex mt="$10" flexDirection="column" alignItems="stretch">
          <TopUpWalletButtonConfirmation btnClickAnalyticsAction={PostHogAction.TokenTokensTopYourWalletBuyAdaClick} />
        </Flex>
      </Flex>
    </Card.Outlined>
  );
};
