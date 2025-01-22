import React from 'react';
import { useTranslation } from 'react-i18next';
import { Flex, Card, Divider } from '@input-output-hk/lace-ui-toolkit';
import { Timeline } from '@lace/common';
import styles from './Wizard.module.scss';

interface Props {
  children: React.ReactNode;
  step?: 'welcome' | 'customize';
  hideTimeline?: boolean;
}

export const Wizard = ({ children, step, hideTimeline = false }: Props): JSX.Element => {
  const { t } = useTranslation();

  return (
    <Card.Elevated className={styles.container}>
      <Flex h="$fill" w="$fill" p="$40">
        {hideTimeline === false && (
          <>
            <Timeline className={styles.timeline}>
              <Timeline.Item active={step === 'welcome' || step === 'customize'}>
                {t('core.namiMigration.timeline.1')}
              </Timeline.Item>
              <Timeline.Item active={step === 'customize'}>{t('core.namiMigration.timeline.2')}</Timeline.Item>
            </Timeline>
            <Divider h="$fill" w="$1" ml="$40" mr="$60" />
          </>
        )}
        <Flex w="$fill" h="$fill" flexDirection="column">
          {children}
        </Flex>
      </Flex>
    </Card.Elevated>
  );
};
