/* eslint-disable react/no-multi-comp */
import React from 'react';
import { sx, Flex, Text, Box, Button, NavigationButton } from '@input-output-hk/lace-ui-toolkit';
import styles from './MidnightEventBanner.module.scss';
import cx from 'classnames';
import banner from '../../assets/images/midnight_banner.png';

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
        mediumScreen: 'none',
        popupScreen: 'block'
      },
      mt: '$10'
    })}
  >
    <Box mb="$10" w="$fill">
      <Button.CallToAction label={translations.learnMore} w="$fill" onClick={onLearnMore} />
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
        mediumScreen: 'flex',
        popupScreen: 'none'
      },
      mt: '$28'
    })}
  >
    <Box mr={'$20'}>
      <Button.CallToAction label={translations.learnMore} onClick={onLearnMore} />
    </Box>
    <Box>
      <Button.Secondary label={translations.reminder} onClick={onReminder} />
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
    style={{ backgroundImage: `url(${banner})` }}
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
      <NavigationButton.Close onClick={onClose} />
    </Box>
    <Flex w="$fill" flexDirection="column">
      <Title translations={translations} />
      <Box mt="$10">
        <Text.Body.Normal className={styles.description} weight="$medium">
          {translations.description}
        </Text.Body.Normal>
      </Box>
    </Flex>
    <PopupButtons translations={translations} onLearnMore={onLearnMore} onReminder={onReminder} />
    <FullScreenButtons translations={translations} onLearnMore={onLearnMore} onReminder={onReminder} />
  </Flex>
);
