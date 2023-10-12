import { Box, Card, ControlButton, Flex, PieChartColor, Text } from '@lace/ui';
import ChevronDownIcon from '@lace/ui/dist/assets/icons/chevron-down.component.svg';
import ChevronUpIcon from '@lace/ui/dist/assets/icons/chevron-up.component.svg';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '../../../overview/StakingInfoCard/StatsTooltip';
import { PERCENTAGE_SCALE_MAX } from '../../../store';
import { DelegationRatioSlider } from '../DelegationRatioSlider';
import * as styles from './PoolDetailsCard.css';
import { PoolDetailsCardData } from './PoolDetailsCardData';
import { RatioInput } from './RatioInput';
import TrashIcon from './trash.svg';

type PercentagesChangeHandler = (value: number) => void;

interface PoolDetailsCardProps {
  color: PieChartColor;
  defaultExpand?: boolean;
  name: string;
  onPercentageChange: PercentagesChangeHandler;
  onRemove?: () => void;
  actualPercentage?: number;
  savedPercentage?: number;
  targetPercentage: number;
  stakeValue: string;
  cardanoCoinSymbol: string;
}

export const PoolDetailsCard = ({
  color,
  defaultExpand = false,
  name,
  onPercentageChange,
  onRemove,
  actualPercentage,
  savedPercentage,
  stakeValue,
  targetPercentage,
  cardanoCoinSymbol,
}: PoolDetailsCardProps) => {
  const { t } = useTranslation();
  const [localValue, setLocalValue] = useState(targetPercentage);
  const [expand, setExpand] = useState(defaultExpand);

  const updatePercentage = (value: number) => {
    setLocalValue(value);
    onPercentageChange(value);
  };

  return (
    <Card.Outlined className={styles.root}>
      <Flex justifyContent="space-between" alignItems="center" my="$24" mx="$32">
        <Flex alignItems="center" gap="$24">
          <Box className={styles.poolIndicator} style={{ backgroundColor: color }} />
          <Text.SubHeading>{name}</Text.SubHeading>
        </Flex>
        <ControlButton.Icon
          icon={expand ? <ChevronUpIcon /> : <ChevronDownIcon />}
          onClick={() => setExpand((prevExpand) => !prevExpand)}
        />
      </Flex>
      {expand && (
        <>
          <PoolDetailsCardData
            cardanoCoinSymbol={cardanoCoinSymbol}
            stakeValue={stakeValue}
            actualPercentage={actualPercentage}
            savedPercentage={savedPercentage}
          />
          <Flex gap="$28" p="$32" pt="$20" flexDirection="column" alignItems="center">
            <Flex justifyContent="space-between" alignItems="center" w="$fill">
              <Text.Body.Large>Edit saved ratio</Text.Body.Large>
              <Flex alignItems="center" gap="$12">
                <Text.Body.Large>Ratio</Text.Body.Large>
                <RatioInput onUpdate={updatePercentage} value={localValue} />
                <Text.Body.Large>%</Text.Body.Large>
              </Flex>
            </Flex>
            <DelegationRatioSlider
              step={1}
              max={PERCENTAGE_SCALE_MAX}
              min={localValue === 0 ? 0 : 1}
              value={localValue}
              onValueChange={updatePercentage}
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
