import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppMode } from '@src/utils/constants';
import { ResetDataError } from '@components/ResetDataError';

export interface FailedMigrationProps {
  appMode: AppMode;
}

export const FailedMigration = ({ appMode }: FailedMigrationProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <ResetDataError
      appMode={appMode}
      title={
        <>
          <div>{t('migrations.failed.title')}</div>
          <div>{t('migrations.failed.subtitle')}</div>
        </>
      }
      description={
        <>
          <div>{t('migrations.failed.errorDescription')}</div>
          <div>
            <b>{t('migrations.failed.actionDescription')}</b>
          </div>
        </>
      }
      buttonLabel={t('migrations.failed.btn.confirm')}
    />
  );
};
