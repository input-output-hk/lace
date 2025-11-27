import React from 'react';
import styles from './SettingsLayout.module.scss';

interface SettingsLinkProps extends React.HTMLProps<HTMLDivElement> {
  children: React.ReactNode;
  description?: React.ReactNode;
  addon?: React.ReactNode;
  'data-testid'?: string;
}

export const SettingsLink = ({ children, description, addon, ...rest }: SettingsLinkProps): React.ReactElement => {
  const dataTestId = rest['data-testid'] || '';

  return (
    <div className={styles.wrapper}>
      <div className={styles.separator} />
      <div className={styles.settingsLink} {...rest}>
        <div className={styles.infoContainer}>
          <div className={styles.label} data-testid={`${dataTestId}-title`}>
            {children}
          </div>
          {/* TODO: Remove fallback description when we fill all of them */}
          <div className={styles.description} data-testid={`${dataTestId}-description`}>
            {description || 'Description here'}
          </div>
        </div>
        {addon && (
          <div className={styles.value} data-testid={`${dataTestId}-addon`}>
            {addon}
          </div>
        )}
      </div>
    </div>
  );
};
