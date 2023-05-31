import React from 'react';
import { Button } from '@lace/common';
import styles from './WalletSetupOption.module.scss';
import Icon from '@ant-design/icons';
import { TranslationsFor } from '@ui/utils/types';

export interface WalletSetupOptionProps {
  copies: TranslationsFor<'title' | 'description' | 'button'>;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  onClick: () => void;
  testId?: string;
}

export const WalletSetupOption = ({
  copies: { title, description, button },
  icon,
  onClick,
  testId
}: WalletSetupOptionProps): React.ReactElement => (
  <div className={styles.walletSetupOption}>
    <div>
      <Icon component={icon} className={styles.icon} data-testid={`${testId}-icon`} />
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
