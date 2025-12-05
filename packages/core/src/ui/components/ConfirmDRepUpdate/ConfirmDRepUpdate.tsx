import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDRepAction } from '../ConfirmDRepRegistration/ConfirmDRepRegistration';

interface Props {
  metadata: {
    url?: string;
    hash?: string;
    drepId: string;
  };
}

export const ConfirmDRepUpdate = ({ metadata }: Props): JSX.Element => {
  const { t } = useTranslation();

  const translations = {
    labels: {
      address: t('core.assetActivityItem.entry.name.UpdateDelegateRepresentativeCertificate'),
      drepId: t('core.DRepUpdate.drepId'),
      hash: t('core.DRepUpdate.hash'),
      url: t('core.DRepUpdate.url')
    }
  };

  return <ConfirmDRepAction metadata={metadata} translations={translations} />;
};
