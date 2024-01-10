import React from 'react';
import { Box, Button, Flex, sx, Text } from '@lace/ui';
import { Button as ExistingButton } from '@lace/common';
import styles from './SharedWalletGetStartedOption.module.scss';

export interface WalletSetupOptionProps {
  copies: Record<'title' | 'description' | 'button', string>;
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
  onClick?: () => void;
  testId?: string;
}

export const SharedWalletSetupOption = ({
  copies: { title, description, button },
  Icon,
  onClick,
  testId
}: WalletSetupOptionProps): React.ReactElement => (
  <Flex flexDirection="column" p="$16" alignItems="center" justifyContent="space-between">
    <Icon className={styles.icon} data-testid={`${testId}-icon`} />
    <Text.Body.Normal
      className={sx({
        color: '$text_primary'
      })}
      weight="$bold"
      data-testid={`${testId}-title`}
    >
      {title}
    </Text.Body.Normal>
    <Text.Body.Small weight="$semibold" className={styles.description} data-testid={`${testId}-description`}>
      {description}
    </Text.Body.Small>
    <ExistingButton
      data-testid={`${testId}-button`}
      className={styles.button}
      color="gradient-secondary"
      onClick={onClick}
    >
      {button}
    </ExistingButton>
    <Box mt="$24" w="$fill">
      <Button.Primary data-testid={`${testId}-button`} onClick={onClick} label={button} w="$fill" />
    </Box>
  </Flex>
);
