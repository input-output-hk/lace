import { Button, Card, Flex, Text } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import { MAX_POOLS_COUNT, selectDraftPoolsCount, useDelegationPortfolioStore } from '../store';
import ArrowRight from './arrow-right.svg';
import * as styles from './PortfolioBar.css';

export const PortfolioBar = () => {
  const { t } = useTranslation();
  const { portfolioMutators, selectedPoolsCount } = useDelegationPortfolioStore((store) => ({
    portfolioMutators: store.mutators,
    selectedPoolsCount: selectDraftPoolsCount(store),
  }));

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
        <Button.Primary label="Next" icon={<ArrowRight className={styles.nextIcon} />} />
      </Flex>
    </Card.Elevated>
  );
};
