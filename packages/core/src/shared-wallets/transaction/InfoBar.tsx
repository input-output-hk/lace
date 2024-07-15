import { InfoBar as InfoBarUiToolkit, InfoComponent } from '@input-output-hk/lace-ui-toolkit';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { CosignersListItem } from './CosignersList';
import styles from './InfoBar.module.scss';

type InfoBarProps = {
  signPolicy: {
    participants: number;
    quorum: number;
  };
  signed: CosignersListItem[];
};

export const InfoBar = ({ signPolicy, signed }: InfoBarProps) => {
  const { t } = useTranslation();
  return (
    <InfoBarUiToolkit
      icon={<InfoComponent className={styles.infoIcon} />}
      message={
        <div className={styles.infoBar}>
          <span className={styles.infoMessage}>
            {signed.length >= signPolicy.quorum
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
              values={{ participants: signPolicy.participants, quorum: signPolicy.quorum }}
              i18nKey="sharedWallets.transaction.cosigners.quorum.current"
            />
          </span>
        </div>
      }
    />
  );
};
