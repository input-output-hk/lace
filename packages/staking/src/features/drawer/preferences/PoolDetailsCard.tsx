import { formatPercentages } from '@lace/common';
import { Box, Card, ControlButton, Flex, PieChartColor, Text } from '@lace/ui';
import ChevronDownIcon from '@lace/ui/dist/assets/icons/chevron-down.component.svg';
import ChevronUpIcon from '@lace/ui/dist/assets/icons/chevron-up.component.svg';
import { useTranslation } from 'react-i18next';
// import { PERCENTAGE_SCALE_MAX } from '../../store';
import * as styles from './PoolDetailsCard.css';
// import TrashIcon from './trash.svg';

interface PoolDetailsCardProps {
  color: PieChartColor;
  expanded: boolean;
  name: string;
  onExpandButtonClick: () => void;
  onRemove?: () => void;
  percentage: number;
  stakeValue: string;
}

export const PoolDetailsCard = ({
  color,
  expanded,
  name,
  onExpandButtonClick,
  onRemove,
  percentage,
  stakeValue,
}: PoolDetailsCardProps) => {
  const { t } = useTranslation();

  console.log(onExpandButtonClick);

  return (
    <Card.Outlined>
      <Flex justifyContent="space-between" alignItems="center" my="$24" mx="$32">
        <Flex alignItems="center" gap="$24">
          <Box className={styles.PoolIndicator} style={{ backgroundColor: color }} />
          <Text.SubHeading>{name}</Text.SubHeading>
        </Flex>
        <ControlButton.Icon icon={expanded ? <ChevronUpIcon /> : <ChevronDownIcon />} onClick={onRemove} />
      </Flex>
      {expanded && (
        <>
          <Flex className={styles.valuesBox}>
            <div>a</div>
            <div>b</div>
            <div>c</div>
          </Flex>
          <Flex justifyContent="space-between" alignItems="center">
            <Text.Body.Normal weight="$semibold">
              {t('drawer.preferences.stakeValue', {
                // eslint-disable-next-line no-magic-numbers
                stakePercentage: formatPercentages(percentage / 100, {
                  decimalPlaces: 0,
                  rounding: 'halfUp',
                }),
                stakeValue,
              })}
            </Text.Body.Normal>
          </Flex>
        </>
      )}
    </Card.Outlined>
  );
};
