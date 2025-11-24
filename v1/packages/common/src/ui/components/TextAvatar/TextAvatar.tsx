import React, { CSSProperties } from 'react';
import classnames from 'classnames';
import { Avatar } from 'antd';
import styles from './TextAvatar.module.scss';

export interface TextAvatarProps {
  children?: React.ReactNode;
  /**
   * Avatar icon background color
   */
  iconBackgroundColor?: CSSProperties['background'];
  /**
   * Avatar icon foreground color
   */
  iconForegroundColor?: CSSProperties['color'];
  /**
   * Avatar size
   */
  size?: 'big';
  className?: string;
}

export const TextAvatar = ({
  iconBackgroundColor,
  iconForegroundColor,
  children,
  className,
  size
}: TextAvatarProps): React.ReactElement => (
  <Avatar
    className={classnames([size && styles[size], styles.textAvatar, className])}
    style={{ color: iconForegroundColor, background: iconBackgroundColor }}
    data-testid="text-avatar"
  >
    {children}
  </Avatar>
);
