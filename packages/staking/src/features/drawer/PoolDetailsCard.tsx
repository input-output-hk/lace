import { Box, Card, ControlButton, Flex, PIE_CHART_DEFAULT_COLOR_SET, Text } from '@lace/ui';
import { PoolCard, PoolHr, PoolIndicator } from './StakePoolPreferences.css';
import TrashIcon from './trash.svg';

interface PoolDetailsCardProps {
  name: string;
  index: number;
  draftPortfolioLength: number;
}

export const PoolDetailsCard = ({ name, index, draftPortfolioLength }: PoolDetailsCardProps) => (
  <Card.Outlined className={PoolCard}>
    <Flex flexDirection={'column'} alignItems={'stretch'} gap={'$16'}>
      <Flex justifyContent={'space-between'} alignItems={'center'}>
        <Flex alignItems={'center'} gap={'$32'}>
          <Box className={PoolIndicator} style={{ backgroundColor: PIE_CHART_DEFAULT_COLOR_SET[index] }} />
          <Text.SubHeading>{name}</Text.SubHeading>
        </Flex>
        <ControlButton.Icon icon={<TrashIcon />} />
      </Flex>
      <Box className={PoolHr} />
      <Flex justifyContent={'space-between'} alignItems={'center'}>
        <Text.Body.Normal>
          {index + 1}/{draftPortfolioLength}
        </Text.Body.Normal>
        <Text.Body.Normal>Balance: 5,000.00 ADA</Text.Body.Normal>
      </Flex>
    </Flex>
  </Card.Outlined>
);
