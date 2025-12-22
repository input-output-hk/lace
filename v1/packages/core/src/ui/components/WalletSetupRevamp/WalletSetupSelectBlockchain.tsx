import React, { ReactElement, useState } from 'react';
import { WalletSetupStepLayoutRevamp } from './WalletSetupStepLayoutRevamp';
import { WalletTimelineSteps } from '@ui/components/WalletSetup';
import { Card, Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { ReactComponent as CardanoIcon } from '../../assets/icons/cardano.svg';
import { ReactComponent as BitcoinIcon } from '../../assets/icons/bitcoin.svg';
import { ReactComponent as MidnightIcon } from '../../assets/icons/midnight.svg';
import { Radio } from '@lace/common';
import styles from './WalletSetupSelectBlockchain.module.scss';
import cn from 'classnames';
import { Blockchain } from '@cardano-sdk/web-extension';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

type BlockchainSelection = Blockchain | 'Midnight';

interface BlockchainOption {
  value: BlockchainSelection;
  title: string;
  subtitle?: string;
  description: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  testId: string;
  badge?: {
    text: string;
    type: 'primary' | 'gradient' | 'secondary';
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
    value: 'Midnight',
    title: t('core.WalletSetupSelectBlockchain.midnight'),
    subtitle: t('core.WalletSetupSelectBlockchain.midnight.networkLabel'),
    description: t('core.WalletSetupSelectBlockchain.midnight.description'),
    icon: MidnightIcon,
    testId: 'midnight-blockchain-card',
    badge: {
      text: t('core.WalletSetupSelectBlockchain.newBadge'),
      type: 'gradient'
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
  showMidnightOption?: boolean;
  midnightDisabled?: boolean;
  midnightDisabledReason?: string;
  onMidnightSelect?: () => void;
}

export const WalletSetupSelectBlockchain = ({
  back,
  next,
  setSelectedBlockchain,
  selectedBlockchain,
  showBitcoinOption = true,
  showMidnightOption = false,
  midnightDisabled = false,
  midnightDisabledReason,
  onMidnightSelect
}: WalletSetupSelectBlockchainProps): ReactElement => {
  const { t } = useTranslation();
  const [isMidnightSelected, setIsMidnightSelected] = useState(false);

  const blockchainOptionsToShow = getBlockchainOptions(t).filter((option) => {
    if (option.value === 'Bitcoin' && !showBitcoinOption) return false;
    if (option.value === 'Midnight' && !showMidnightOption) return false;
    return true;
  });

  const isOptionDisabled = (value: string): boolean => value === 'Midnight' && midnightDisabled;

  const getDisabledDescription = (option: BlockchainOption): string => {
    if (option.value === 'Midnight' && midnightDisabled && midnightDisabledReason) {
      return midnightDisabledReason;
    }
    return option.description;
  };

  const getDisabledBadge = (option: BlockchainOption): BlockchainOption['badge'] => {
    if (option.value === 'Midnight' && midnightDisabled) {
      return {
        text: t('core.WalletSetupSelectBlockchain.midnight.alreadyHaveWallet'),
        type: 'secondary'
      };
    }
    return option.badge;
  };

  const getSubtitle = (option: BlockchainOption): string | undefined =>
    option.value === 'Midnight' && midnightDisabled ? undefined : option.subtitle;

  const handleSelect = (value: BlockchainSelection) => {
    if (isOptionDisabled(value)) return;

    if (value === 'Midnight') {
      setIsMidnightSelected(true);
    } else {
      setIsMidnightSelected(false);
      setSelectedBlockchain(value);
    }
  };

  const handleNext = () => {
    if (isMidnightSelected && onMidnightSelect) {
      onMidnightSelect();
    } else {
      next();
    }
  };

  const isSelected = (value: BlockchainSelection): boolean => {
    if (value === 'Midnight') return isMidnightSelected;
    return !isMidnightSelected && selectedBlockchain === value;
  };

  return (
    <WalletSetupStepLayoutRevamp
      title={t('core.WalletSetupSelectBlockchain.title')}
      onBack={back}
      onNext={handleNext}
      description={t('core.WalletSetupSelectBlockchain.description')}
      currentTimelineStep={WalletTimelineSteps.SELECT_BLOCKCHAIN}
    >
      <Flex flexDirection="column" gap="$12">
        {blockchainOptionsToShow.map((option) => {
          const Icon = option.icon;
          const disabled = isOptionDisabled(option.value);
          const badge = getDisabledBadge(option);
          const description = getDisabledDescription(option);
          const subtitle = getSubtitle(option);

          return (
            <Card.Outlined
              key={option.value}
              data-testid={option.testId}
              onClick={() => handleSelect(option.value)}
              className={cn(styles.blockchainCard, {
                [styles.selected]: isSelected(option.value),
                [styles.disabled]: disabled
              })}
            >
              <Flex gap="$16" alignItems="flex-start" px="$16" py="$12">
                <Radio
                  checked={isSelected(option.value)}
                  onChange={() => handleSelect(option.value)}
                  disabled={disabled}
                  data-testid={`${option.value.toLowerCase()}-option-radio-button`}
                />
                <Flex flexDirection="column" gap="$8">
                  <Flex gap="$8" alignItems="center" justifyContent="center">
                    <Text.Body.Large data-testid={`${option.value.toLowerCase()}-option-title`}>
                      <span style={{ fontWeight: 'bold' }}>{option.title}</span>
                      {subtitle && ` ${subtitle}`}
                    </Text.Body.Large>
                    {badge && (
                      <div
                        className={cn({
                          [styles.primaryBadge]: badge.type === 'primary',
                          [styles.gradientBadge]: badge.type === 'gradient',
                          [styles.secondaryBadge]: badge.type === 'secondary'
                        })}
                      >
                        <Text.Label
                          className={styles.badgeText}
                          data-testid={`${option.value.toLowerCase()}-option-badge`}
                        >
                          {badge.text}
                        </Text.Label>
                      </div>
                    )}
                  </Flex>
                  <Text.Body.Normal color="secondary" data-testid={`${option.value.toLowerCase()}-option-description`}>
                    {description}
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
