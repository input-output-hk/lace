import { Card, Cell, Grid, PieChart, PieChartColor, Text } from '@lace/ui';
import { Fragment } from 'react';
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

const makeInfoData = ({ balance, numberOfPools, status }: MakeInfoDataParams) => [
  { name: 'Status', value: status },
  { name: 'Balance', value: balance },
  { name: 'Pool(s)', value: numberOfPools },
];

export const DelegationCard = ({ distribution, status }: DelegationCardProps) => {
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
            {infoData.map(({ name, value }) => (
              <Fragment key={name}>
                <Cell className={styles.infoLabel}>
                  <Text.Body.Large weight={'$semibold'}>{name}</Text.Body.Large>
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
