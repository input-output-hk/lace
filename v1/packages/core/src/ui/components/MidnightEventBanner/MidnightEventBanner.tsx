/* eslint-disable react/no-multi-comp */
import React from 'react';
import { Box, Button, Flex, NavigationButton, sx, Text } from '@input-output-hk/lace-ui-toolkit';
import styles from './MidnightEventBanner.module.scss';
import cx from 'classnames';
import midnightGDLight from '../../assets/images/midnight_gd_light.png';

interface Props {
  translations: {
    title: string;
    description: string;
    learnMore: string;
    reminder: string;
  };
  onClose?: () => void;
  onLearnMore?: () => void;
  onReminder?: () => void;
}

const PopupButtons = ({ translations, onLearnMore, onReminder }: Props): JSX.Element => (
  <Box
    w="$fill"
    className={sx({
      display: {
        minimumScreen: 'none',
        popupScreen: 'block'
      },
      mt: '$10'
    })}
  >
    <Box mb="$10" w="$fill">
      <Button.CallToAction
        label={translations.learnMore}
        w="$fill"
        onClick={onLearnMore}
        data-testid="learn-more-button-popup"
      />
    </Box>
    <Box w="$fill">
      <Button.Secondary label={translations.reminder} w="$fill" onClick={onReminder} />
    </Box>
  </Box>
);

const FullScreenButtons = ({ translations, onLearnMore, onReminder }: Props): JSX.Element => (
  <Box
    w="$fill"
    className={sx({
      display: {
        minimumScreen: 'flex',
        popupScreen: 'none'
      },
      mt: '$28'
    })}
  >
    <Box mr={'$20'}>
      <Button.CallToAction
        label={translations.learnMore}
        onClick={onLearnMore}
        data-testid="learn-more-button-extended"
      />
    </Box>
    <Box>
      <Button.Secondary
        label={translations.reminder}
        onClick={onReminder}
        data-testid="remind-me-later-button-extended"
      />
    </Box>
  </Box>
);

const Title = ({ translations }: Props): JSX.Element => (
  <>
    <Text.SubHeading
      className={cx(
        styles.title,
        sx({
          display: {
            mediumScreen: 'block',
            popupScreen: 'none'
          }
        })
      )}
      weight="$bold"
      data-testid="midnight-event-banner-title"
    >
      {translations.title}
    </Text.SubHeading>
    <Text.Body.Large
      className={cx(
        styles.title,
        sx({
          display: {
            mediumScreen: 'none',
            popupScreen: 'block'
          }
        })
      )}
      weight="$bold"
    >
      {translations.title}
    </Text.Body.Large>
  </>
);

export const MidnightEventBanner = ({ translations, onClose, onLearnMore, onReminder }: Props): JSX.Element => (
  <Flex
    style={{ backgroundImage: `url(${midnightGDLight})` }}
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
      <NavigationButton.Close onClick={onClose} data-testid="midnight-event-banner-close-button" />
    </Box>
    <Flex w="$fill" flexDirection="column">
      <Title translations={translations} />
      <Box
        mt="$10"
        className={sx({
          paddingRight: {
            minimumScreen: '$214',
            popupScreen: '$20'
          }
        })}
      >
        <Text.Body.Normal
          className={styles.description}
          weight="$medium"
          data-testid="midnight-event-banner-description"
        >
          {translations.description}
        </Text.Body.Normal>
      </Box>
    </Flex>
    <PopupButtons translations={translations} onLearnMore={onLearnMore} onReminder={onReminder} />
    <FullScreenButtons translations={translations} onLearnMore={onLearnMore} onReminder={onReminder} />
  </Flex>
);
