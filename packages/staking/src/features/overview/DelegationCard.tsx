import { Card, Cell, Grid, PieChart, PieChartColor, Text } from '@lace/ui';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { TranslationKey } from '../i18n/types';
import * as styles from './DelegationCard.css';

type Status = 'multi-staking' | 'over-staked' | 'under-staked';

type DelegationCardProps = {
  distribution: Array<{
    name: string;
    value: number;
    color: PieChartColor;
  }>;
  status: Status;
};

const mapOfStatusToLabel: Record<Status, string> = {
  'multi-staking': 'Multi staking',
  'over-staked': 'Over staked',
  'under-staked': 'Under staked',
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
  { nameTranslationKey: 'overview.delegationCard.status', value: status },
  { nameTranslationKey: 'overview.delegationCard.balance', value: balance },
  { nameTranslationKey: 'overview.delegationCard.pools', value: numberOfPools },
];

export const DelegationCard = ({ distribution, status }: DelegationCardProps) => {
  const { t } = useTranslation();
  const balance = distribution.reduce((acc, { value }) => acc + value, 0);
  const numberOfPools = distribution.length;
  const infoData = makeInfoData({ balance, numberOfPools, status: mapOfStatusToLabel[status] });

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
