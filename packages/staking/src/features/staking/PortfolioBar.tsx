import { Button, Card, Flex, Text } from '@lace/ui';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MAX_POOLS_COUNT, selectDraftPoolsCount, useDelegationPortfolioStore, useStakePoolDetails } from '../store';
import ArrowRight from './arrow-right.svg';
import * as styles from './PortfolioBar.css';

export const PortfolioBar = () => {
  const { t } = useTranslation();
  const { portfolioMutators, selectedPoolsCount } = useDelegationPortfolioStore((store) => ({
    portfolioMutators: store.mutators,
    selectedPoolsCount: selectDraftPoolsCount(store),
  }));
  const { setIsDrawerVisible, setSection } = useStakePoolDetails();
  const onStake = useCallback(() => {
    // TODO: LW-7396 enable StakeConfirmation modal in the flow in the case of restaking
    // if (isDelegating) {
    //   setStakeConfirmationVisible(true);
    //   return;
    // }

    setSection();
    setIsDrawerVisible(true);
  }, [setIsDrawerVisible, setSection]);

  if (selectedPoolsCount === 0) return null;

  return (
    <Card.Elevated className={styles.barContainer}>
      <Text.Body.Normal>
        <span className={styles.selectedPoolsLabel}>{t('portfolioBar.selectedPools', { selectedPoolsCount })}</span>
        &nbsp;
        <span>{t('portfolioBar.maxPools', { maxPoolsCount: MAX_POOLS_COUNT })}</span>
      </Text.Body.Normal>
      <Flex className={styles.buttons}>
        <Button.Secondary label="Clear" onClick={portfolioMutators.clearDraft} />
        <Button.Primary label="Next" icon={<ArrowRight className={styles.nextIcon} />} onClick={onStake} />
      </Flex>
    </Card.Elevated>
  );
};
