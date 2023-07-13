import React from 'react';
import Exclamation from './exclamation-circle-small.svg';
import styles from './ResultMessage.module.scss';
import Success from './success-staking.svg';

type Status = 'success' | 'error';

const iconByStatus: Record<Status, React.FC<React.SVGProps<SVGSVGElement>>> = {
  error: Exclamation,
  success: Success,
};

export interface ResultMessageProps {
  status?: Status;
  title: React.ReactNode;
  description: React.ReactNode;
}

export const ResultMessage = ({ status = 'success', title, description }: ResultMessageProps): React.ReactElement => {
  const Icon = iconByStatus[status];

  return (
    <div className={styles.content} data-testid="result-message-content">
      <Icon className={styles.img} data-testid="result-message-img" />
      <div className={styles.vertical}>
        <h4 className={styles.title} data-testid="result-message-title">
          {title}
        </h4>
        <h5 className={styles.description} data-testid="result-message-description">
          {description}
        </h5>
      </div>
    </div>
  );
};
