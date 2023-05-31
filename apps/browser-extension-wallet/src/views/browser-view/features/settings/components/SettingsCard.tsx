import React from 'react';
import styles from './SettingsLayout.module.scss';

interface SettingsCardProps {
  children: React.ReactNode;
}

export const SettingsCard = ({ children }: SettingsCardProps): React.ReactElement => (
  <div className={styles.settingsCard}>{children}</div>
);
