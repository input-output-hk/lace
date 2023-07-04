import React from 'react';
import { Typography } from 'antd';
import cn from 'classnames';
import { ReactComponent as DefaultIcon } from '../../assets/icons/banner-icon.component.svg';
import styles from './Banner.module.scss';

const { Text } = Typography;

const shouldBeDisplayedAsText = (message: React.ReactNode) =>
  typeof message === 'string' || typeof message === 'number';

export interface BannerProps {
  withIcon?: boolean;
  customIcon?: React.ReactElement;
  message: string | React.ReactElement;
  className?: string;
  descriptionClassName?: string;
  popupView?: boolean;
  description?: React.ReactNode;
}

export const Banner = ({
  message,
  description,
  customIcon,
  withIcon,
  className,
  descriptionClassName,
  popupView
}: BannerProps): React.ReactElement => {
  const descriptionElement = shouldBeDisplayedAsText(description) ? (
    <Text className={styles.description}>{description}</Text>
  ) : (
    description
  );
  return (
    <div
      className={cn(styles.bannerContainer, { [className]: className, [styles.popupView]: popupView })}
      data-testid="banner-container"
    >
      {withIcon && (
        <div
          className={cn(styles.iconContainer, {
            [styles.withDescription]: !!description,
            [styles.popupView]: popupView
          })}
        >
          {customIcon ? (
            React.cloneElement(customIcon, { 'data-testid': 'banner-icon' })
          ) : (
            <DefaultIcon className={styles.icon} data-testid="banner-icon" />
          )}
        </div>
      )}
      <div
        className={cn(styles.descriptionContainer, { [descriptionClassName]: descriptionClassName })}
        data-testid="banner-description"
      >
        <Text className={styles.message}>{message}</Text>
        {description && <div>{descriptionElement}</div>}
      </div>
    </div>
  );
};
