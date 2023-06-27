import { Button, Card, Flex, Text, sx } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import { useDelegationPortfolioStore } from '../store';
import ArrowRightIcon from './arrow-right.component.svg';
import * as styles from './PortfolioBar.css';

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
        <Button.Primary label="Next" icon={<img src={String(ArrowRightIcon)} alt="Go next" />} />
      </Flex>
    </Card.Elevated>
  );
};
