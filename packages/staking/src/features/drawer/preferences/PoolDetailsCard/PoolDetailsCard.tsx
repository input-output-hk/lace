import { formatPercentages } from '@lace/common';
import { Box, Card, ControlButton, Flex, PieChartColor, Text } from '@lace/ui';
import ChevronDownIcon from '@lace/ui/dist/assets/icons/chevron-down.component.svg';
import ChevronUpIcon from '@lace/ui/dist/assets/icons/chevron-up.component.svg';
import denounce from 'lodash/debounce';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import InfoIcon from '../../../../assets/icons/info-icon.svg';
// import { PERCENTAGE_SCALE_MAX } from '../../store';
import { DelegationRatioSlider } from '../DelegationRatioSlider';
import * as styles from './PoolDetailsCard.css';
import TrashIcon from './trash.svg';

// TODO
const PERCENTAGE_SCALE_MAX = 100;
type PercentagesChangeHandler = (value: number) => void;

interface PoolDetailsCardProps {
  color: PieChartColor;
  expanded: boolean;
  name: string;
  onExpandButtonClick: () => void;
  onPercentageChange: PercentagesChangeHandler;
  onRemove?: () => void;
  actualRatio: number;
  savedRatio?: number;
  stakeValue: string;
}

export const PoolDetailsCard = ({
  color,
  expanded,
  name,
  onExpandButtonClick,
  onPercentageChange,
  onRemove,
  actualRatio,
  savedRatio,
  stakeValue,
}: PoolDetailsCardProps) => {
  const { t } = useTranslation();
  const [localValue, setLocalValue] = useState(actualRatio);

  // eslint-disable-next-line no-magic-numbers,react-hooks/exhaustive-deps
  const onSliderChange = useCallback<PercentagesChangeHandler>(denounce(onPercentageChange, 300), [onPercentageChange]);
  useEffect(() => {
    onSliderChange(localValue);
  }, [onSliderChange, localValue]);

  return (
    <Card.Outlined>
      <Flex justifyContent="space-between" alignItems="center" my="$24" mx="$32">
        <Flex alignItems="center" gap="$24">
          <Box className={styles.poolIndicator} style={{ backgroundColor: color }} />
          <Text.SubHeading>{name}</Text.SubHeading>
        </Flex>
        <ControlButton.Icon icon={expanded ? <ChevronUpIcon /> : <ChevronDownIcon />} onClick={onExpandButtonClick} />
      </Flex>
      {expanded && (
        <>
          <Flex className={styles.valuesRow}>
            <Flex pl="$32" pr="$32" flexDirection="column">
              <Box>
                <Text.Body.Large weight="$medium" className={styles.valueLabel}>
                  Saved ratio
                </Text.Body.Large>
                <InfoIcon className={styles.valueInfoIcon} />
              </Box>
              <Text.Body.Large weight="$semibold">
                {savedRatio || '-'} {savedRatio && <Text.Body.Small weight="$medium">%</Text.Body.Small>}
              </Text.Body.Large>
            </Flex>
            <Flex pl="$32" pr="$32" flexDirection="column">
              <Box>
                <Text.Body.Large weight="$medium" className={styles.valueLabel}>
                  Actual ratio
                </Text.Body.Large>
                <InfoIcon className={styles.valueInfoIcon} />
              </Box>
              <Text.Body.Large weight="$semibold">
                {actualRatio} <Text.Body.Small weight="$medium">%</Text.Body.Small>
              </Text.Body.Large>
            </Flex>
            <Flex pl="$32" pr="$32" flexDirection="column">
              <Box>
                <Text.Body.Large weight="$medium" className={styles.valueLabel}>
                  Actual stake
                </Text.Body.Large>
                <InfoIcon className={styles.valueInfoIcon} />
              </Box>
              <Text.Body.Large weight="$semibold">{stakeValue}</Text.Body.Large>
            </Flex>
          </Flex>
          <Flex justifyContent="space-between" alignItems="center">
            <Text.Body.Normal weight="$semibold" className={styles.valueLabel}>
              {t('drawer.preferences.stakeValue', {
                // eslint-disable-next-line no-magic-numbers
                stakePercentage: formatPercentages(actualRatio / PERCENTAGE_SCALE_MAX, {
                  decimalPlaces: 0,
                  rounding: 'halfUp',
                }),
                stakeValue,
              })}
            </Text.Body.Normal>
          </Flex>
          <Flex gap="$28" p="$32" pt="$20" flexDirection="column" alignItems="center">
            <Flex justifyContent="space-between" alignItems="center" w="$fill">
              <Text.Body.Large>Edit saved ratio</Text.Body.Large>
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
