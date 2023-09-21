/* eslint-disable react/no-multi-comp */
import { Flex, Text } from '@lace/ui';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { MAX_POOLS_COUNT, useNewDelegationPortfolioStore } from '../store';
import * as styles from './GetStartedSteps.css';

type StepCircleProps = {
  step: number;
};
const StepCircle = ({ step }: StepCircleProps) => (
  <span className={styles.stepCircle}>
    <span className={styles.stepCircleNumber}>{step}</span>
  </span>
);

export const GetStartedSteps = (): React.ReactElement => {
  const { t } = useTranslation();
  const portfolioMutators = useNewDelegationPortfolioStore((store) => store.mutators);

  return (
    <Flex flexDirection="column" gap="$32">
      <Flex flexDirection="column" gap="$8">
        <Text.Heading>{t('overview.noStaking.getStarted')}</Text.Heading>
        <Text.Body.Normal weight="$semibold" className={styles.stepDescription}>
          {t('overview.noStaking.followSteps')}
        </Text.Body.Normal>
      </Flex>
      <Flex flexDirection="column" gap="$40">
        <Flex flexDirection="row" gap="$24">
          <StepCircle step={1} />
          <Flex flexDirection="column" gap="$4">
            <Text.Body.Large weight="$bold">{t('overview.noStaking.searchForPoolTitle')}</Text.Body.Large>
            <Text.Body.Normal weight="$semibold" className={styles.stepDescription}>
              <Trans
                i18nKey="overview.noStaking.searchForPoolDescription"
                t={t}
                components={{
                  Link: (
                    <a onClick={() => portfolioMutators.executeCommand({ type: 'CommandOverviewGoToBrowsePools' })} />
                  ),
                }}
              />
            </Text.Body.Normal>
          </Flex>
        </Flex>
        <Flex flexDirection="row" gap="$24">
          <StepCircle step={2} />
          <Flex flexDirection="column" gap="$4">
            <Text.Body.Large weight="$bold">{t('overview.noStaking.selectPoolsTitle')}</Text.Body.Large>
            <Text.Body.Normal weight="$semibold" className={styles.stepDescription}>
              <Trans
                i18nKey="overview.noStaking.selectPoolsDescription"
                t={t}
                components={{
                  Link: <a target="_blank" href={`${process.env.FAQ_URL}?question=what-are-staking-and-delegation`} />,
                }}
                values={{ maxPools: MAX_POOLS_COUNT }}
              />
            </Text.Body.Normal>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};
