import React from 'react';
import cn from 'classnames';
import { Button } from '@lace/common';
import styles from './WalletSetupOption.module.scss';
import Icon from '@ant-design/icons';
import { Tooltip } from '@input-output-hk/lace-ui-toolkit';
import { TranslationsFor } from '@ui/utils/types';

export interface WalletSetupOptionProps {
  copies:
    | TranslationsFor<'title' | 'description' | 'button'>
    | TranslationsFor<'title' | 'description' | 'button' | 'tooltip'>;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  onClick: () => void;
  testId?: string;
  disabled?: boolean;
}

export const WalletSetupOption = ({
  copies,
  icon,
  onClick,
  testId,
  disabled
}: WalletSetupOptionProps): React.ReactElement => {
  const content = (
    <div className={cn(styles.walletSetupOption, { [styles.disabled]: disabled })}>
      <div>
        <Icon component={icon} className={styles.icon} data-testid={`${testId}-icon`} />
        <div className={styles.title} data-testid={`${testId}-title`}>
          {copies.title}
        </div>
        <div className={styles.description} data-testid={`${testId}-description`}>
          {copies.description}
        </div>
      </div>
      <Button
        disabled={disabled}
        data-testid={`${testId}-button`}
        className={styles.button}
        color="gradient-secondary"
        onClick={onClick}
      >
        {copies.button}
      </Button>
    </div>
  );

  return disabled ? (
    <Tooltip align="center" side="top" label={'tooltip' in copies ? copies.tooltip : ''}>
      {content}
    </Tooltip>
  ) : (
    content
  );
};
