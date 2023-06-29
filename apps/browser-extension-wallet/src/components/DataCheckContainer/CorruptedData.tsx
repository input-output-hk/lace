import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppMode } from '@src/utils/constants';
import { ResetDataError } from '@components/ResetDataError';

export interface CorruptedDataProps {
  appMode: AppMode;
}

export const CorruptedData = ({ appMode }: CorruptedDataProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <ResetDataError
      appMode={appMode}
      description={
        <>
          <div>{t('corruptedData.errorDescription')}</div>
          <div>
            <b>{t('corruptedData.actionDescription')}</b>
          </div>
        </>
      }
      title={<div>{t('corruptedData.title')}</div>}
      buttonLabel={t('corruptedData.btn.confirm')}
    />
  );
};
