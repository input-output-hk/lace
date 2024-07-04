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
    moreDetails: string;
    reminder: string;
  };
  onClose?: () => void;
  onMoreDetails?: () => void;
  onReminder?: () => void;
}

const PopupButtons = ({ translations, onMoreDetails, onReminder }: Props): JSX.Element => (
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
      <Button.CallToAction label={translations.moreDetails} w="$fill" onClick={onMoreDetails} />
    </Box>
    <Box w="$fill">
      <Button.Secondary label={translations.reminder} w="$fill" onClick={onReminder} />
    </Box>
  </Box>
);

const FullScreenButtons = ({ translations, onMoreDetails, onReminder }: Props): JSX.Element => (
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
      <Button.CallToAction label={translations.moreDetails} onClick={onMoreDetails} />
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

export const MidnightEventBanner = ({ translations, onClose, onMoreDetails, onReminder }: Props): JSX.Element => (
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
    <PopupButtons translations={translations} onMoreDetails={onMoreDetails} onReminder={onReminder} />
    <FullScreenButtons translations={translations} onMoreDetails={onMoreDetails} onReminder={onReminder} />
  </Flex>
);
