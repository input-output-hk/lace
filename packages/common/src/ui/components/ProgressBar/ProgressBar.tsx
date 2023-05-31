import React, { useEffect, useState } from 'react';
import cn from 'classnames';
import styles from './ProgressBar.module.scss';

export type ProgressBarProps = {
  duration?: number;
  wrapperClassName?: string;
  className?: string;
  width?: string;
  dataTestId?: string;
};

const defaultDuration = 5;

export const ProgressBar = ({
  duration = defaultDuration,
  wrapperClassName = '',
  className = '',
  width = '100%',
  dataTestId = 'progressbar-wrapper-id'
}: ProgressBarProps): React.ReactElement => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    window.setTimeout(() => setMounted(true), 0);
  }, []);

  return (
    <div data-testid={dataTestId} className={cn(wrapperClassName, 'progressbar-wrapper', styles.progressBarContainer)}>
      <div
        className={cn(className, styles.progressBar)}
        style={{ transition: `width ${duration}s`, ...(mounted && { width }) }}
      />
    </div>
  );
};
