import React from 'react';
import { Typography } from 'antd';
import cn from 'classnames';
import DefaultIcon from '../../assets/icons/banner-icon.component.svg';
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
  description?: React.ReactNode;
}

export const Banner = ({
  message,
  description,
  customIcon,
  withIcon,
  className,
  descriptionClassName
}: BannerProps): React.ReactElement => {
  const descriptionElement = shouldBeDisplayedAsText(description) ? (
    <Text className={styles.description}>{description}</Text>
  ) : (
    description
  );
  return (
    <div className={cn(styles.bannerContainer, { [className]: className })} data-testid="banner-container">
      {withIcon && (
        <div className={cn(styles.iconContainer, { [styles.withDescription]: !!description })}>
          {customIcon || <DefaultIcon className={styles.icon} data-testid="banner-icon" />}
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
