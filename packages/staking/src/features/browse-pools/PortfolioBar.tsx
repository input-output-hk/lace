import { Button, Card, Flex, Text } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import ArrowRight from '../staking/arrow-right.svg';
import { MAX_POOLS_COUNT, useDelegationPortfolioStore } from '../store';
import * as styles from './PortfolioBar.css';

type PortfolioBarParams = {
  onStake: () => void;
};

export const PortfolioBar = ({ onStake }: PortfolioBarParams) => {
  const { t } = useTranslation();
  const { portfolioMutators, selectedPoolsCount } = useDelegationPortfolioStore((store) => ({
    portfolioMutators: store.mutators,
    selectedPoolsCount: store.selections.length,
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
        <Button.Secondary
          label={t('portfolioBar.clear')}
          onClick={portfolioMutators.clearSelections}
          data-testid="portfoliobar-btn-clear"
        />
        <Button.Primary
          label={t('portfolioBar.next')}
          icon={<ArrowRight className={styles.nextIcon} />}
          onClick={onStake}
          data-testid="portfoliobar-btn-next"
        />
      </Flex>
    </Card.Elevated>
  );
};
