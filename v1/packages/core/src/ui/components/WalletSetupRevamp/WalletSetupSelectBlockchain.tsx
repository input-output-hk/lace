import React, { ReactElement } from 'react';
import { WalletSetupStepLayoutRevamp } from './WalletSetupStepLayoutRevamp';
import { WalletTimelineSteps } from '@ui/components/WalletSetup';
import { Card, Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { ReactComponent as CardanoIcon } from '../../assets/icons/cardano.svg';
import { ReactComponent as BitcoinIcon } from '../../assets/icons/bitcoin.svg';
import { Radio } from '@lace/common';
import styles from './WalletSetupSelectBlockchain.module.scss';
import cn from 'classnames';
import { Blockchain } from '@cardano-sdk/web-extension';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

interface BlockchainOption {
  value: Blockchain;
  title: string;
  description: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  testId: string;
  badge?: {
    text: string;
    type: 'primary' | 'gradient';
  };
}

const getBlockchainOptions = (t: TFunction): BlockchainOption[] => [
  {
    value: 'Cardano',
    title: t('core.WalletSetupSelectBlockchain.cardano'),
    description: t('core.WalletSetupSelectBlockchain.cardano.description'),
    icon: CardanoIcon,
    testId: 'cardano-blockchain-card',
    badge: {
      text: t('core.WalletSetupSelectBlockchain.defaultBadge'),
      type: 'primary'
    }
  },
  {
    value: 'Bitcoin',
    title: t('core.WalletSetupSelectBlockchain.bitcoin'),
    description: t('core.WalletSetupSelectBlockchain.bitcoin.description'),
    icon: BitcoinIcon,
    testId: 'bitcoin-blockchain-card',
    badge: {
      text: t('core.WalletSetupSelectBlockchain.newBadge'),
      type: 'gradient'
    }
  }
];

interface WalletSetupSelectBlockchainProps {
  back: () => void;
  next: () => void;
  selectedBlockchain: Blockchain;
  setSelectedBlockchain: (blockchain: Blockchain) => void;
  showBitcoinOption?: boolean;
}

export const WalletSetupSelectBlockchain = ({
  back,
  next,
  setSelectedBlockchain,
  selectedBlockchain,
  showBitcoinOption = true
}: WalletSetupSelectBlockchainProps): ReactElement => {
  const { t } = useTranslation();
  const blockchainOptionsToShow = showBitcoinOption
    ? getBlockchainOptions(t)
    : getBlockchainOptions(t).filter((option) => option.value !== 'Bitcoin');

  return (
    <WalletSetupStepLayoutRevamp
      title={t('core.WalletSetupSelectBlockchain.title')}
      onBack={back}
      onNext={next}
      description={t('core.WalletSetupSelectBlockchain.description')}
      currentTimelineStep={WalletTimelineSteps.SELECT_BLOCKCHAIN}
    >
      <Flex flexDirection="column" gap="$16">
        {blockchainOptionsToShow.map((option) => {
          const Icon = option.icon;
          return (
            <Card.Outlined
              key={option.value}
              data-testid={option.testId}
              onClick={() => setSelectedBlockchain(option.value)}
              className={cn(styles.blockchainCard, {
                [styles.selected]: selectedBlockchain === option.value
              })}
            >
              <Flex gap="$16" alignItems="flex-start" px="$16" py="$16">
                <Radio
                  checked={selectedBlockchain === option.value}
                  onChange={() => setSelectedBlockchain(option.value)}
                  data-testid={`${option.value.toLowerCase()}-option-radio-button`}
                />
                <Flex flexDirection="column" gap="$8">
                  <Flex gap="$8" alignItems="center" justifyContent="center">
                    <Text.Body.Large weight="$bold" data-testid={`${option.value.toLowerCase()}-option-title`}>
                      {option.title}
                    </Text.Body.Large>
                    <div
                      className={cn({
                        [styles.primaryBadge]: option.badge?.type === 'primary',
                        [styles.gradientBadge]: option.badge?.type === 'gradient'
                      })}
                    >
                      <Text.Label
                        className={styles.badgeText}
                        data-testid={`${option.value.toLowerCase()}-option-badge`}
                      >
                        {option.badge?.text}
                      </Text.Label>
                    </div>
                  </Flex>
                  <Text.Body.Normal color="secondary" data-testid={`${option.value.toLowerCase()}-option-description`}>
                    {option.description}
                  </Text.Body.Normal>
                </Flex>
                <div style={{ alignSelf: 'center' }}>
                  <Icon className={styles.icon} data-testid={`${option.value.toLowerCase()}-option-icon`} />
                </div>
              </Flex>
            </Card.Outlined>
          );
        })}
      </Flex>
    </WalletSetupStepLayoutRevamp>
  );
};
