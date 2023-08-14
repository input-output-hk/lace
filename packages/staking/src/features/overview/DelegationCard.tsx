import { Card, PieChart, PieChartColor, Text } from '@lace/ui';
import cn from 'classnames';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { TranslationKey } from '../i18n';
import * as styles from './DelegationCard.css';

type Status = 'multi-delegation' | 'over-staked' | 'ready' | 'simple-delegation' | 'under-staked';

type DelegationCardProps = {
  arrangement?: 'vertical' | 'horizontal';
  balance: string;
  cardanoCoinSymbol: string;
  distribution: Array<{
    name: string;
    value: number;
    color: PieChartColor;
  }>;
  status: Status;
  showDistribution?: boolean;
};

const mapOfStatusToTranslationKey: Record<Status, TranslationKey> = {
  'multi-delegation': 'overview.delegationCard.statuses.multiDelegation',
  'over-staked': 'overview.delegationCard.statuses.overStaked',
  ready: 'overview.delegationCard.statuses.ready',
  'simple-delegation': 'overview.delegationCard.statuses.simpleDelegation',
  'under-staked': 'overview.delegationCard.statuses.underStaked',
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
  }> = [
    { nameTranslationKey: 'overview.delegationCard.label.status', value: t(mapOfStatusToTranslationKey[status]) },
    { nameTranslationKey: 'overview.delegationCard.label.balance', value: `${balance} ${cardanoCoinSymbol}` },
    { nameTranslationKey: 'overview.delegationCard.label.pools', value: numberOfPools },
  ];

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
          <PieChart data={distribution} colors={distribution.map((d) => d.color)} />
          {showDistribution && <Text.SubHeading className={styles.counter}>100%</Text.SubHeading>}
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
            {infoData.map(({ nameTranslationKey, value }) => (
              <Fragment key={nameTranslationKey}>
                <div className={styles.infoLabel}>
                  <Text.Body.Large weight={'$semibold'} data-testid={`${nameTranslationKey}-label`}>
                    {t(nameTranslationKey)}
                  </Text.Body.Large>
                </div>
                <div className={styles.infoValue}>
                  <Text.Body.Normal weight={'$bold'} data-testid={`${nameTranslationKey}-value`}>
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
