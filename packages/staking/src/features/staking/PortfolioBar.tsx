import { Button, Card, Flex, Text, sx } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import ArrowRightIcon from './arrow-right.component.svg';
import { barStyles, spanBold } from './PortfolioBar.css';

export const PortfolioBar = () => {
  const { t } = useTranslation();
  return (
    <Card.Elevated className={barStyles}>
      <Text.Body.Normal>
        <span className={spanBold}>{t('portfolioBar.selectedPools', { selectedPoolsCount: 1 })}</span>&nbsp;
        <span>{t('portfolioBar.maxPools', { maxPoolsCount: 5 })}</span>
      </Text.Body.Normal>
      <Flex className={sx({ gap: '$16' })}>
        <Button.Secondary label="Clear" />
        <Button.Primary label="Next" icon={<img src={String(ArrowRightIcon)} alt="Go next" />} />
      </Flex>
    </Card.Elevated>
  );
};
