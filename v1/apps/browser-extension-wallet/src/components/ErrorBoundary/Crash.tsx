import React from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import styles from './Crash.module.scss';
import { Button } from '@input-output-hk/lace-ui-toolkit';
import { useRuntime } from '@hooks/useRuntime';

export const Crash = (): React.ReactElement => {
  const { t } = useTranslation();
  const runtime = useRuntime();

  return (
    <div className={classNames([styles.crashContainer])} data-testid="crash">
      <p className={styles.crashText} data-testid="crash-text">
        {t('general.errors.crash')}
      </p>
      <Button.CallToAction
        onClick={() => runtime.reload()}
        label={t('general.errors.reloadExtension')}
        data-testid="crash-reload"
      />
    </div>
  );
};
