import { Box, Card, ControlButton, Flex, PieChartColor, Text } from '@lace/ui';
import ChevronDownIcon from '@lace/ui/dist/assets/icons/chevron-down.component.svg';
import ChevronUpIcon from '@lace/ui/dist/assets/icons/chevron-up.component.svg';
import denounce from 'lodash/debounce';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import InfoIcon from '../../../../assets/icons/info-icon.svg';
import { Tooltip } from '../../../overview/StakingInfoCard/StatsTooltip';
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
  actualRatio?: number;
  savedRatio?: number;
  targetRatio: number;
  stakeValue: string;
  cardanoCoinSymbol: string;
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
  targetRatio,
  cardanoCoinSymbol,
}: PoolDetailsCardProps) => {
  const effectInitialized = useRef(false);
  const { t } = useTranslation();
  const [localValue, setLocalValue] = useState(targetRatio);

  // eslint-disable-next-line no-magic-numbers,react-hooks/exhaustive-deps
  const onSliderChange = useCallback<PercentagesChangeHandler>(denounce(onPercentageChange, 300), [onPercentageChange]);
  useEffect(() => {
    if (!effectInitialized.current) {
      effectInitialized.current = true;
      return;
    }
    onSliderChange(localValue);
  }, [onSliderChange, localValue]);

  return (
    <Card.Outlined className={styles.root}>
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
            <Flex pl="$32" pr="$32" flexDirection="column" className={styles.valueBox}>
              <Box>
                <Text.Body.Large weight="$medium" className={styles.valueLabel}>
                  {t('drawer.preferences.poolDetails.savedRatio')}
                </Text.Body.Large>
                {/* TODO tooltips & styles */}
                <InfoIcon className={styles.valueInfoIcon} />
              </Box>
              <Text.Body.Large weight="$semibold">
                {savedRatio || '-'} {savedRatio && <Text.Body.Small weight="$medium">%</Text.Body.Small>}
              </Text.Body.Large>
            </Flex>
            <Flex pl="$32" pr="$32" flexDirection="column" className={styles.valueBox}>
              <Box>
                <Text.Body.Large weight="$medium" className={styles.valueLabel}>
                  {t('drawer.preferences.poolDetails.actualRatio')}
                </Text.Body.Large>
                {/* TODO tooltips & styles */}
                <InfoIcon className={styles.valueInfoIcon} />
              </Box>
              <Text.Body.Large weight="$semibold">
                {actualRatio || '-'} {actualRatio && <Text.Body.Small weight="$medium">%</Text.Body.Small>}
              </Text.Body.Large>
            </Flex>
            <Flex pl="$32" pr="$32" flexDirection="column" className={styles.valueBox}>
              <Box>
                <Text.Body.Large weight="$medium" className={styles.valueLabel}>
                  {t('drawer.preferences.poolDetails.actualStake')}
                </Text.Body.Large>
                {/* TODO tooltips & styles */}
                <InfoIcon className={styles.valueInfoIcon} />
              </Box>
              <Text.Body.Large weight="$semibold">
                {stakeValue} <Text.Body.Small weight="$medium">{cardanoCoinSymbol}</Text.Body.Small>
              </Text.Body.Large>
            </Flex>
          </Flex>
          <Flex gap="$28" p="$32" pt="$20" flexDirection="column" alignItems="center">
            <Flex justifyContent="space-between" alignItems="center" w="$fill">
              <Text.Body.Large>Edit saved ratio</Text.Body.Large>
              <Flex alignItems="center" gap="$12">
                <Text.Body.Large>Ratio</Text.Body.Large>
                <input type="number" max={PERCENTAGE_SCALE_MAX} min={localValue === 0 ? 0 : 1} value={localValue} />
                <Text.Body.Large>%</Text.Body.Large>
              </Flex>
            </Flex>
            <DelegationRatioSlider
              step={1}
              max={PERCENTAGE_SCALE_MAX}
              min={localValue === 0 ? 0 : 1}
              value={localValue}
              onValueChange={setLocalValue}
            />
            <Tooltip content={onRemove ? undefined : t('drawer.preferences.pickMorePools')}>
              <div>
                <ControlButton.Outlined
                  label="Remove pool from portfolio"
                  icon={<TrashIcon />}
                  w="$fill"
                  onClick={onRemove}
                  disabled={!onRemove}
                />
              </div>
            </Tooltip>
          </Flex>
        </>
      )}
    </Card.Outlined>
  );
};
