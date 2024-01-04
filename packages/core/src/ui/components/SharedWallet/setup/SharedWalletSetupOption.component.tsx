import React from 'react';
import styles from './SharedWalletSetupOption.module.scss';
import { Button } from '@lace/common';

export interface WalletSetupOptionProps {
  copies: Record<'title' | 'description' | 'button', string>;
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
  onClick?: () => void;
  testId?: string;
}

export const SharedWalletSetupOption = ({
  copies: { title, description, button },
  Icon,
  onClick,
  testId
}: WalletSetupOptionProps): React.ReactElement => (
  <div className={styles.sharedWalletSetupOption}>
    <div>
      <Icon className={styles.icon} data-testid={`${testId}-icon`} />
      <div className={styles.title} data-testid={`${testId}-title`}>
        {title}
      </div>
      <div className={styles.description} data-testid={`${testId}-description`}>
        {description}
      </div>
    </div>
    <Button data-testid={`${testId}-button`} className={styles.button} color="gradient-secondary" onClick={onClick}>
      {button}
    </Button>
  </div>
);
