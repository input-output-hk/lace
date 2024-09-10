import { InfoBar as InfoBarUiToolkit, InfoComponent, lightColorScheme } from '@input-output-hk/lace-ui-toolkit';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import styles from './InfoBar.module.scss';
import { SignPolicy } from './types';

type InfoBarProps = {
  signPolicy: SignPolicy;
};

export const InfoBar = ({ signPolicy }: InfoBarProps) => {
  const { t } = useTranslation();
  const quorumIsReached = signPolicy.signers.filter(({ signed }) => !!signed).length >= signPolicy.requiredCosigners;
  return (
    <InfoBarUiToolkit
      icon={<InfoComponent color={lightColorScheme.$primary_accent_purple} />}
      message={
        <div className={styles.infoBar}>
          <span className={styles.infoMessage}>
            {quorumIsReached
              ? t('sharedWallets.transaction.cosigners.quorum.reached')
              : t('sharedWallets.transaction.cosigners.quorum.required')}
          </span>
          <span className={styles.infoStats}>
            <Trans
              components={{
                b: <b />,
                span: <span />,
                stat: <span className={styles.stats} />,
              }}
              values={{ participants: signPolicy.signers.length, quorum: signPolicy.requiredCosigners }}
              i18nKey="sharedWallets.transaction.cosigners.quorum.current"
            />
          </span>
        </div>
      }
    />
  );
};
