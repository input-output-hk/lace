import { Card, Cell, Grid, PieChart, PieChartColor, Text } from '@lace/ui';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { TranslationKey } from '../i18n/types';
import * as styles from './DelegationCard.css';

type Status = 'multi-delegation' | 'over-staked' | 'ready' | 'simple-delegation' | 'under-staked';

type DelegationCardProps = {
  distribution: Array<{
    name: string;
    value: number;
    color: PieChartColor;
  }>;
  status: Status;
};

const mapOfStatusToTranslationKey: Record<Status, TranslationKey> = {
  'multi-delegation': 'overview.delegationCard.statuses.multiDelegation',
  'over-staked': 'overview.delegationCard.statuses.overStaked',
  ready: 'overview.delegationCard.statuses.ready',
  'simple-delegation': 'overview.delegationCard.statuses.simpleDelegation',
  'under-staked': 'overview.delegationCard.statuses.underStaked',
};

type MakeInfoDataParams = {
  balance: number;
  numberOfPools: number;
  status: string;
};

const makeInfoData = ({
  balance,
  numberOfPools,
  status,
}: MakeInfoDataParams): Array<{
  nameTranslationKey: TranslationKey;
  value: MakeInfoDataParams[keyof MakeInfoDataParams];
}> => [
  { nameTranslationKey: 'overview.delegationCard.label.status', value: status },
  { nameTranslationKey: 'overview.delegationCard.label.balance', value: balance },
  { nameTranslationKey: 'overview.delegationCard.label.pools', value: numberOfPools },
];

export const DelegationCard = ({ distribution, status }: DelegationCardProps) => {
  const { t } = useTranslation();
  const balance = distribution.reduce((acc, { value }) => acc + value, 0);
  const numberOfPools = distribution.length;
  const infoData = makeInfoData({ balance, numberOfPools, status: t(mapOfStatusToTranslationKey[status]) });

  return (
    <Card.Greyed>
      <div className={styles.content}>
        <div className={styles.chart}>
          <PieChart data={distribution} colors={distribution.map((d) => d.color)} />
        </div>
        <div className={styles.info}>
          <Grid columns={'$2'} rows={'$3'}>
            {infoData.map(({ nameTranslationKey, value }) => (
              <Fragment key={nameTranslationKey}>
                <Cell className={styles.infoLabel}>
                  <Text.Body.Large weight={'$semibold'}>{t(nameTranslationKey)}</Text.Body.Large>
                </Cell>
                <Cell className={styles.infoValue}>
                  <Text.Body.Large weight={'$bold'}>{value}</Text.Body.Large>
                </Cell>
              </Fragment>
            ))}
          </Grid>
        </div>
      </div>
    </Card.Greyed>
  );
};
