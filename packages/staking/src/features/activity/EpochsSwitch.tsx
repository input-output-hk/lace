import { ControlButton, Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from 'react-i18next';
import styles from './EpochsSwitch.module.scss';

// eslint-disable-next-line no-magic-numbers
const EPOCHS_OPTIONS = [5, 15];

type EpochsSwitchProps = {
  epochsCount: number;
  setEpochsCount: (epochsCount: number) => void;
};

export const EpochsSwitch = ({ epochsCount, setEpochsCount }: EpochsSwitchProps) => {
  const { t } = useTranslation();
  return (
    <Flex gap="$8" alignItems="center">
      <Text.Body.Normal>{t('activity.rewardsChart.epochs')}:</Text.Body.Normal>
      <Flex p="$8" gap="$8" alignItems="center" className={styles.buttonsBackground}>
        {EPOCHS_OPTIONS.map((option, i) => {
          const activeOption = epochsCount === option;
          const Component = activeOption ? ControlButton.Filled : ControlButton.Outlined;
          return (
            <Component
              key={i}
              label={`${t('activity.rewardsChart.last')} ${option}`}
              onClick={() => setEpochsCount(option)}
            />
          );
        })}
      </Flex>
    </Flex>
  );
};
