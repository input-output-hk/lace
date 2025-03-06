/* eslint-disable @typescript-eslint/no-non-null-assertion */
import cn from 'classnames';
import React from 'react';
import ExclamationSmall from './exclamation-circle-small.svg';
import Exclamation from './exclamation-circle.svg';
import styles from './ResultMessage.module.scss';
import Success from './success-staking.svg';

type Status = 'success' | 'error';

const iconByStatus: Record<Status, React.FC<React.SVGProps<SVGSVGElement>>> = {
  error: Exclamation,
  success: Success,
};

// TODO discuss with design team if we can have 1 error icon and just manipulate its size
const popupViewIconByStatus: Record<Status, React.FC<React.SVGProps<SVGSVGElement>>> = {
  ...iconByStatus,
  error: ExclamationSmall,
};

export interface ResultMessageProps {
  status?: Status;
  title: React.ReactNode;
  description: React.ReactNode;
  popupView?: boolean;
  fullWidth?: boolean;
}

export const ResultMessage = ({
  status = 'success',
  title,
  description,
  popupView,
  fullWidth,
}: ResultMessageProps): React.ReactElement => {
  const Icon = popupView ? popupViewIconByStatus[status] : iconByStatus[status];

  return (
    <div className={cn(styles.content, { [styles.fullWidth!]: fullWidth })} data-testid="result-message-content">
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
