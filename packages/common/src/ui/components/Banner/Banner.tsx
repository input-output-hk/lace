import React, { ReactElement } from 'react';
import { Typography } from 'antd';
import cn from 'classnames';
import Icon from '../../../../../staking/src/features/drawer/SocialNetworks/banner-icon.svg';
import styles from './Banner.module.scss';

const { Text } = Typography;

const shouldBeDisplayedAsText = (message: React.ReactNode) =>
  typeof message === 'string' || typeof message === 'number';

export interface BannerProps {
  withIcon?: boolean;
  customIcon?: ReactElement;
  message: string;
  className?: string;
  description?: React.ReactNode;
}

export const Banner = ({ message, description, customIcon, withIcon, className }: BannerProps): React.ReactElement => {
  const descriptionElement = shouldBeDisplayedAsText(description) ? (
    <Text className={styles.description}>{description}</Text>
  ) : (
    description
  );
  return (
    <div className={cn(styles.bannerContainer, { [className]: className })} data-testid="banner-container">
      {withIcon && (
        <div className={cn(styles.iconContainer, { [styles.withDescription]: !!description })}>
          <img src={customIcon || Icon} data-testid="banner-icon" alt="icon" />
        </div>
      )}
      <div className={styles.descriptionContainer} data-testid="banner-description">
        <Text className={styles.message}>{message}</Text>
        {description && <div>{descriptionElement}</div>}
      </div>
    </div>
  );
};
