import { Button, Card, Flex, Text, sx } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import { useDelegationPortfolioStore } from '../store';
import * as styles from './PortfolioBar.css';
import { ArrowRightIcon } from './PortfolioBar.data';

export const PortfolioBar = () => {
  const { t } = useTranslation();
  const selectedPoolsCount = useDelegationPortfolioStore((state) => state.poolsCount());
  return (
    <Card.Elevated className={styles.barContainer}>
      <Text.Body.Normal>
        <span className={styles.selectedPoolsLabel}>{t('portfolioBar.selectedPools', { selectedPoolsCount })}</span>
        &nbsp;
        <span>{t('portfolioBar.maxPools', { maxPoolsCount: 5 })}</span>
      </Text.Body.Normal>
      <Flex className={sx({ gap: '$16' })}>
        <Button.Secondary label="Clear" />
        <Button.Primary label="Next" icon={<img src={ArrowRightIcon} alt="Go next" />} />
      </Flex>
    </Card.Elevated>
  );
};
