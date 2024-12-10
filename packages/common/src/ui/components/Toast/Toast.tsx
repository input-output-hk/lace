import React from 'react';
import cn from 'classnames';
import { message } from 'antd';
import AntdIcon from '@ant-design/icons';
import { ReactComponent as CrossIcon } from '../../assets/icons/cross.component.svg';
import { ReactComponent as CopyIcon } from '../../assets/icons/copy.component.svg';
import { ProgressBar } from '../ProgressBar/ProgressBar';
import { ToastProps } from './types';
import styles from './Toast.module.scss';

const defaultDuration = 3;

export const notify = ({
  duration = defaultDuration,
  text,
  withProgressBar = true,
  icon,
  style,
  className,
  key,
  ...props
}: ToastProps): ReturnType<typeof message.success> => {
  const Icon = icon || CopyIcon;

  return message.success({
    content: (
      <div data-testid="toast-content-wrapper" className={styles.messageContentWrapper}>
        <div className={styles.messageContent}>
          <span className={styles.iconContainer}>
            <Icon className={styles.icon} style={{ fontSize: 18 }} data-testid="toast-icon" />
          </span>
          <span className={styles.messageText} data-testid="toast-message-text">
            {text}
          </span>
          <AntdIcon
            data-testid="toast-close-btn"
            onClick={() => message.destroy(key)}
            className={styles.icon}
            component={CrossIcon}
            style={{ fontSize: 14 }}
          />
        </div>
        {withProgressBar && <ProgressBar duration={duration} />}
      </div>
    ),
    duration,
    className: cn(styles.message, { ...(className && { [className]: className }) }),
    style: {
      marginTop: 'calc(100vh - 90px)',
      ...(!!style && style)
    },
    icon: <></>,
    ...props
  });
};

export const destroy = message.destroy;
