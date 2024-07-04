import { Wallet } from '@lace/cardano';
import React from 'react';
import { TxDetailsGroup } from '../../TxDetailsGroup';
import { CertificateView } from './CertificateView';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { Box } from '@input-output-hk/lace-ui-toolkit';
import styles from './TxDetailsCertificates.module.scss';

interface TxDetailsCertificatesProps {
  chainNetworkId: Wallet.Cardano.NetworkId;
  certificates: Wallet.Cardano.Certificate[];
  cardanoCoin: Wallet.CoinId;
}

export const TxDetailsCertificates = ({
  certificates,
  chainNetworkId,
  cardanoCoin
}: TxDetailsCertificatesProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <TxDetailsGroup title={t('core.activityDetails.certificates')} testId="certificates" withSeparatorLine>
      {certificates.map((cert, index) => (
        <Box
          className={classNames({
            [styles.devider]: index > 0
          })}
          key={`${cert.__typename}_${index}`}
        >
          <CertificateView certificate={cert} chainNetworkId={chainNetworkId} cardanoCoin={cardanoCoin} />
        </Box>
      ))}
    </TxDetailsGroup>
  );
};
