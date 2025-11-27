/* eslint-disable complexity */
import React from 'react';
import { Typography } from 'antd';
import cn from 'classnames';
import { ReactComponent as DefaultIcon } from '../../assets/icons/banner-icon.component.svg';
import { ReactComponent as ChevronRight } from '../../assets/icons/chevron-right.component.svg';
import styles from './Banner.module.scss';
import { Button } from '../Button';
import { Link } from 'react-router-dom';

const { Text } = Typography;

const shouldBeDisplayedAsText = (message: React.ReactNode) =>
  typeof message === 'string' || typeof message === 'number';

export type BannerProps = {
  withIcon?: boolean;
  customIcon?: React.ReactElement;
  message: string | React.ReactElement;
  messagePartTwo?: string | React.ReactElement;
  linkMessage?: string | React.ReactElement;
  buttonMessage?: string | React.ReactElement;
  className?: string;
  descriptionClassName?: string;
  popupView?: boolean;
  description?: React.ReactNode;
  onLinkClick?: (event?: React.MouseEvent<HTMLButtonElement>) => unknown;
} & (
  | { onButtonClick?: undefined; onBannerClick?: undefined }
  | { onButtonClick?: (event?: React.MouseEvent<HTMLButtonElement>) => unknown; onBannerClick?: undefined }
  | { onBannerClick?: (event?: React.MouseEvent<HTMLDivElement>) => unknown; onButtonClick?: undefined }
);

export const Banner = ({
  message,
  description,
  customIcon,
  withIcon,
  className,
  descriptionClassName,
  popupView,
  onBannerClick,
  onButtonClick,
  linkMessage,
  messagePartTwo,
  buttonMessage
}: BannerProps): React.ReactElement => {
  const descriptionElement = shouldBeDisplayedAsText(description) ? (
    <Text className={styles.description}>{description}</Text>
  ) : (
    description
  );
  return (
    <div
      className={cn(styles.bannerContainer, {
        ...(className && { [className]: className }),
        [styles.popupView]: popupView,
        [styles.clickable]: !!onBannerClick
      })}
      data-testid="banner-container"
      onClick={onBannerClick}
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
        className={cn(styles.contentContainer, {
          ...(descriptionClassName && { [descriptionClassName]: descriptionClassName })
        })}
        data-testid="banner-description"
      >
        <div className={cn(styles.descriptionContainer)}>
          <Text className={styles.message}>{message}</Text>
          {linkMessage && <Link to="">{linkMessage}</Link>}
          {messagePartTwo && <Text className={styles.message}>{messagePartTwo}</Text>}
          {description && <div>{descriptionElement}</div>}
        </div>
        {!!onButtonClick && (
          <div className={cn(styles.buttonContainer)}>
            {buttonMessage && (
              <Button data-testid="banner-button" onClick={onButtonClick}>
                {' '}
                {buttonMessage}{' '}
              </Button>
            )}
          </div>
        )}
        {!!onBannerClick && (
          <div className={cn(styles.chevronRightIconContainer)}>
            <ChevronRight />
          </div>
        )}
      </div>
    </div>
  );
};
