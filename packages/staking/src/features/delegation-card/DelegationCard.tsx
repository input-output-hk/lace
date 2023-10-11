import { Card, PIE_CHART_DEFAULT_COLOR_SET, PieChart, PieChartColor, PieChartGradientColor, Text } from '@lace/ui';
import cn from 'classnames';
import { Fragment, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TranslationKey } from '../i18n';
// import { PERCENTAGE_SCALE_MAX } from '../store';
import * as styles from './DelegationCard.css';

// TODO
const PERCENTAGE_SCALE_MAX = 100;
export type DelegationStatus =
  | 'multi-delegation'
  | 'over-allocated'
  | 'simple-delegation'
  | 'under-allocated'
  | 'no-selection';

type Distribution = Array<{
  name: string;
  percentage: number;
  color: PieChartColor;
}>;

type DelegationCardProps = {
  arrangement?: 'vertical' | 'horizontal';
  balance: string;
  cardanoCoinSymbol: string;
  distribution: Distribution;
  status: DelegationStatus;
  showDistribution?: boolean;
};

const statusLabelTranslationKeysByDelegationStatus: Record<DelegationStatus, TranslationKey> = {
  'multi-delegation': 'overview.delegationCard.statuses.multiDelegation',
  'no-selection': 'overview.delegationCard.statuses.noSelection',
  'over-allocated': 'overview.delegationCard.statuses.overAllocated',
  'simple-delegation': 'overview.delegationCard.statuses.simpleDelegation',
  'under-allocated': 'overview.delegationCard.statuses.underAllocated',
};

export const DelegationCard = ({
  arrangement = 'horizontal',
  balance,
  cardanoCoinSymbol,
  distribution,
  status,
  showDistribution = false,
}: DelegationCardProps) => {
  const { t } = useTranslation();
  const numberOfPools = distribution.length;

  const infoData: Array<{
    nameTranslationKey: TranslationKey;
    value: number | string;
    isWarning?: boolean;
  }> = [
    {
      isWarning: status === 'over-allocated' || status === 'under-allocated',
      nameTranslationKey: 'overview.delegationCard.label.status',
      value: t(statusLabelTranslationKeysByDelegationStatus[status]),
    },
    { nameTranslationKey: 'overview.delegationCard.label.balance', value: `${balance} ${cardanoCoinSymbol}` },
    { nameTranslationKey: 'overview.delegationCard.label.pools', value: numberOfPools },
  ];

  const totalPercentage = useMemo(() => {
    const percentageSum = distribution.reduce((acc, cur) => acc + cur.percentage, 0);
    // TODO: remove after LW-8683 implemented
    // Round to avoid floating point errors in case of on-chain (float) percentages being passed to this component
    return Math.round(percentageSum);
  }, [distribution]);

  const { data, colorSet = PIE_CHART_DEFAULT_COLOR_SET } = useMemo((): {
    colorSet?: PieChartColor[];
    data: Distribution;
  } => {
    const GREY_COLOR: PieChartColor = '#C0C0C0';
    const RED_COLOR: PieChartColor = '#FF5470';
    if (totalPercentage > PERCENTAGE_SCALE_MAX) {
      // Merge slices into one red over-allocated slice
      return {
        colorSet: [RED_COLOR],
        data: [{ color: RED_COLOR, name: 'Over-allocated', percentage: totalPercentage }],
      };
    }
    if (totalPercentage < PERCENTAGE_SCALE_MAX) {
      // Add grey unallocated slice
      return {
        colorSet: [...PIE_CHART_DEFAULT_COLOR_SET.slice(0, distribution.length), GREY_COLOR],
        data: [
          ...distribution,
          {
            color: GREY_COLOR,
            name: 'Unallocated',
            percentage: PERCENTAGE_SCALE_MAX - totalPercentage,
          },
        ],
      };
    }
    if (distribution.length === 1) {
      return {
        colorSet: [PieChartGradientColor.LaceLinearGradient],
        data: distribution.map((item) => ({ ...item, color: PieChartGradientColor.LaceLinearGradient })),
      };
    }
    return {
      data: distribution,
    };
  }, [distribution, totalPercentage]);

  return (
    <Card.Greyed>
      <div
        className={cn(styles.content, {
          [styles.contentHorizontal]: arrangement === 'horizontal',
          [styles.contentVertical]: arrangement === 'vertical',
        })}
        data-testid="delegation-info-card"
      >
        <div className={styles.chart} data-testid="delegation-chart">
          <PieChart data={data} nameKey="name" valueKey="percentage" colors={colorSet} />
          {showDistribution && <Text.SubHeading className={styles.counter}>{totalPercentage}%</Text.SubHeading>}
        </div>
        <div
          className={cn({
            [styles.infoHorizontal]: arrangement === 'horizontal',
            [styles.infoVertical]: arrangement === 'vertical',
          })}
        >
          <div
            style={{
              display: 'grid',
              gap: 16,
              gridTemplateColumns: 'minmax(max-content, 100%) minmax(max-content, 100%)',
            }}
          >
            {infoData.map(({ nameTranslationKey, value, isWarning }) => (
              <Fragment key={nameTranslationKey}>
                <div className={styles.infoLabel}>
                  <Text.Body.Large weight="$semibold" data-testid={`${nameTranslationKey}-label`}>
                    {t(nameTranslationKey)}
                  </Text.Body.Large>
                </div>
                <div className={isWarning ? styles.warningValue : styles.infoValue}>
                  <Text.Body.Normal weight="$bold" data-testid={`${nameTranslationKey}-value`}>
                    {value}
                  </Text.Body.Normal>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </Card.Greyed>
  );
};
