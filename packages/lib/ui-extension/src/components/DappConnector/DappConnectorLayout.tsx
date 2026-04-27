import type { ReactNode } from 'react';

import { Box, Button, Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import React from 'react';

import LaceLogo from '../../assets/images/lace-logo.component.svg';

import styles from './DappConnectorLayout.module.scss';

type ButtonProps = {
  action: () => void;
  label: string;
  disabled?: boolean;
};

interface LayoutProps {
  children: ReactNode;
  primaryButton?: ButtonProps;
  secondaryButton?: ButtonProps;
  title: string;
}

export const DappConnectorLayout = ({
  children,
  title,
  primaryButton,
  secondaryButton,
}: LayoutProps) => (
  <Flex
    flexDirection="column"
    py="$16"
    justifyContent="space-between"
    className={styles.container}>
    <Box px="$16">
      <LaceLogo height={40} width={40} data-testid="dapp-connector-logo" />
      <Text.Heading data-testid="dapp-connector-title">{title}</Text.Heading>
      <Box mt="$16">{children}</Box>
    </Box>
    <Flex
      flexDirection="column"
      w="$fill"
      gap="$8"
      pt="$16"
      px="$16"
      className={styles.footer}>
      {primaryButton && (
        <Button.CallToAction
          label={primaryButton.label}
          w="$fill"
          onClick={primaryButton.action}
          disabled={primaryButton.disabled}
          data-testid="dapp-connector-primary-button"
        />
      )}
      {secondaryButton && (
        <Button.Secondary
          label={secondaryButton.label}
          w="$fill"
          onClick={secondaryButton.action}
          data-testid="dapp-connector-secondary-button"
        />
      )}
    </Flex>
  </Flex>
);
