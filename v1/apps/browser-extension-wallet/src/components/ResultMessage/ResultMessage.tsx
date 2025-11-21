import React from 'react';
import errorImg from '../../assets/icons/exclamation-circle.svg';
import successImg from '../../assets/icons/clock-icon.svg';
import infoImg from '../../assets/icons/info.component.svg';
import styles from './ResultMessage.module.scss';
import cn from 'classnames';

type Status = 'success' | 'error' | 'info';

const bgImg: Record<Status, string> = {
  success: successImg,
  error: errorImg,
  info: infoImg
};

export interface ResultMessageProps {
  status?: Status;
  title?: React.ReactNode;
  description?: React.ReactNode;
  customBgImg?: string;
  fullWidth?: boolean;
}

export const ResultMessage = ({
  status = 'success',
  title,
  description,
  customBgImg,
  fullWidth
}: ResultMessageProps): React.ReactElement => (
  <div className={cn(styles.content, { [styles.fullWidth]: fullWidth })} data-testid="result-message-content">
    <img
      className={styles.img}
      src={customBgImg ?? bgImg[status]}
      alt="result illustration"
      data-testid="result-message-img"
    />
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
