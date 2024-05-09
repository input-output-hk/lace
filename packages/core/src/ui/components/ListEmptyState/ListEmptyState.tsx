import React from 'react';
import { ReactComponent as NeutralFaceIcon } from '../../assets/icons/neutral-face.component.svg';
import { ReactComponent as SadFaceIcon } from '../../assets/icons/sad-face.component.svg';
import styles from './ListEmptyState.module.scss';

export const ListEmptyState = (props: { message: React.ReactNode; icon: 'sad-face' | 'neutral-face' }) => {
  const Icon: Record<string, React.ReactElement> = {
    'sad-face': <SadFaceIcon className={styles.img} data-testid="sad-face-icon" />,
    'neutral-face': <NeutralFaceIcon className={styles.img} data-testid="neutral-face-icon" />
  };

  return (
    <div className={styles.emptyMessage}>
      {Icon[props.icon]}
      <p className={styles.text} data-testid="asset-list-empty-state-message">
        {props.message}
      </p>
    </div>
  );
};
