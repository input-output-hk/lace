import { formatPercentages } from '@lace/common';
import { Box, Card, ControlButton, Flex, PieChartColor, Text } from '@lace/ui';
import ChevronDownIcon from '@lace/ui/dist/assets/icons/chevron-down.component.svg';
import ChevronUpIcon from '@lace/ui/dist/assets/icons/chevron-up.component.svg';
import denounce from 'lodash/debounce';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
// import { PERCENTAGE_SCALE_MAX } from '../../store';
import { DelegationRatioSlider } from './delegation-ratio-slider';
import * as styles from './PoolDetailsCard.css';
import TrashIcon from './trash.svg';

type PercentagesChangeHandler = (value: number) => void;

interface PoolDetailsCardProps {
  color: PieChartColor;
  expanded: boolean;
  name: string;
  onExpandButtonClick: () => void;
  onPercentageChange: PercentagesChangeHandler;
  onRemove?: () => void;
  percentage: number;
  stakeValue: string;
}

export const PoolDetailsCard = ({
  color,
  expanded,
  name,
  onExpandButtonClick,
  onPercentageChange,
  onRemove,
  percentage,
  stakeValue,
}: PoolDetailsCardProps) => {
  const { t } = useTranslation();
  const [localValue, setLocalValue] = useState(percentage);

  // eslint-disable-next-line no-magic-numbers,react-hooks/exhaustive-deps
  const onSliderChange = useCallback<PercentagesChangeHandler>(denounce(onPercentageChange, 300), [onPercentageChange]);
  useEffect(() => {
    onSliderChange(localValue);
  }, [onSliderChange, localValue]);

  return (
    <Card.Outlined>
      <Flex justifyContent="space-between" alignItems="center" my="$24" mx="$32">
        <Flex alignItems="center" gap="$24">
          <Box className={styles.PoolIndicator} style={{ backgroundColor: color }} />
          <Text.SubHeading>{name}</Text.SubHeading>
        </Flex>
        <ControlButton.Icon icon={expanded ? <ChevronUpIcon /> : <ChevronDownIcon />} onClick={onExpandButtonClick} />
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
          <Flex gap="$28" p="$32" pt="$20" flexDirection="column" alignItems="center">
            <Flex justifyContent="space-between" alignItems="center" w="$fill">
              <Text.Body.Large>Edit saved ration</Text.Body.Large>
              <Flex alignItems="center" gap="$12">
                <Text.Body.Large>Ratio</Text.Body.Large>
                <input type="number" max={100} min={localValue === 0 ? 0 : 1} value={localValue} />
                <Text.Body.Large>%</Text.Body.Large>
              </Flex>
            </Flex>
            <DelegationRatioSlider
              step={1}
              max={100}
              min={localValue === 0 ? 0 : 1}
              value={localValue}
              onValueChange={setLocalValue}
            />
            <ControlButton.Outlined
              label="Remove pool from portfolio"
              icon={<TrashIcon />}
              w="$fill"
              onClick={onRemove}
            />
          </Flex>
        </>
      )}
    </Card.Outlined>
  );
};
