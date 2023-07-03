import { Button, Card, Flex, Text } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import { selectPoolsCount, useDelegationPortfolioStore } from '../store';
import ArrowRight from './arrow-right.svg';
import * as styles from './PortfolioBar.css';

export const PortfolioBar = () => {
  const { t } = useTranslation();
  const selectedPoolsCount = useDelegationPortfolioStore(selectPoolsCount);

  return (
    <Card.Elevated className={styles.barContainer}>
      <Text.Body.Normal>
        <span className={styles.selectedPoolsLabel}>{t('portfolioBar.selectedPools', { selectedPoolsCount })}</span>
        &nbsp;
        <span>{t('portfolioBar.maxPools', { maxPoolsCount: 5 })}</span>
      </Text.Body.Normal>
      <Flex className={styles.buttons}>
        <Button.Secondary label="Clear" />
        <Button.Primary label="Next" icon={<ArrowRight className={styles.nextIcon} />} />
      </Flex>
    </Card.Elevated>
  );
};
