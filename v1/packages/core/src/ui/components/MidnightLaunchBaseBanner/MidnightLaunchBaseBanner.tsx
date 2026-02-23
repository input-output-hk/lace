import React, { ReactElement } from 'react';
import styles from './MidnightLaunchBaseBanner.module.scss';
import { Box, Button, Flex, NavigationButton, sx, Text } from '@input-output-hk/lace-ui-toolkit';
import cx from 'classnames';
import midnightBg from '../../assets/images/midnight-banner-background.png';

type MidnightLaunchBannerProps = {
  translations: {
    title: string;
    description: string;
    ctaButton: string;
  };
  onCtaButtonClick: () => void;
  onClose: () => void;
};

export const MidnightLaunchBaseBanner = ({
  translations,
  onCtaButtonClick,
  onClose
}: MidnightLaunchBannerProps): ReactElement => (
  <Flex
    style={{ backgroundImage: `url(${midnightBg})` }}
    className={cx(
      styles.container,
      sx({
        borderRadius: '$large',
        pt: '$32',
        px: '$20',
        pb: {
          mediumScreen: '$32',
          popupScreen: '$20'
        },
        h: '$auto'
      })
    )}
    h="$fill"
    alignItems="center"
    justifyContent="center"
    flexDirection="column"
    w="$fill"
  >
    <Box className={styles.close}>
      <NavigationButton.Close onClick={onClose} data-testid="midnight-launch-banner-close-button" />
    </Box>
    <Flex w="$fill" flexDirection="column" gap="$16">
      <Text.SubHeading className={styles.title} weight="$bold" data-testid="midnight-launch-banner-title">
        {translations.title}
      </Text.SubHeading>
      <Text.Body.Normal
        className={styles.description}
        weight="$medium"
        data-testid="midnight-launch-banner-description"
      >
        {translations.description}
      </Text.Body.Normal>
    </Flex>
    <Box mt="$16" w="$fill">
      <Button.CallToAction
        label={translations.ctaButton}
        onClick={onCtaButtonClick}
        data-testid="midnight-launch-banner-cta-button"
      />
    </Box>
  </Flex>
);
