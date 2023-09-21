import { Button, Card, Flex, Text } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import ArrowRight from '../staking/arrow-right.svg';
import { Flow, MAX_POOLS_COUNT, useDelegationPortfolioStore } from '../store';
import * as styles from './PortfolioBar.css';

export const PortfolioBar = () => {
  const { t } = useTranslation();
  const { activeFlow, portfolioMutators, selectedPoolsCount } = useDelegationPortfolioStore((store) => ({
    activeFlow: store.activeFlow,
    portfolioMutators: store.mutators,
    selectedPoolsCount: store.selectedPortfolio.length,
  }));

  if (![Flow.BrowsePools, Flow.PoolDetails].includes(activeFlow) || selectedPoolsCount === 0) return null;

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
          onClick={() => portfolioMutators.executeCommand({ type: 'ClearSelections' })}
          data-testid="portfoliobar-btn-clear"
        />
        <Button.Primary
          label={t('portfolioBar.next')}
          icon={<ArrowRight className={styles.nextIcon} />}
          onClick={() => portfolioMutators.executeCommand({ type: 'CreateNewPortfolio' })}
          data-testid="portfoliobar-btn-next"
        />
      </Flex>
    </Card.Elevated>
  );
};
