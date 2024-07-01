import { Box, Button, Flex, Text, sx } from '@lace/ui';
import cn from 'classnames';
import React from 'react';
import styles from './SharedWalletEntryOption.module.scss';

export interface WalletSetupOptionProps {
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
  copies: {
    button: string;
    description: React.ReactElement;
    title: string;
  };
  disabled?: boolean;
  onClick?: () => void;
  testId?: string;
}

export const SharedWalletEntryOption = ({
  Icon,
  copies: { title, description, button },
  disabled = false,
  onClick,
  testId,
}: WalletSetupOptionProps): React.ReactElement => (
  <Flex flexDirection="column" p="$16" alignItems="center" justifyContent="space-between" className={styles.option}>
    <Icon className={cn(styles.icon, { [`${styles.disabled}`]: disabled })} data-testid={`${testId}-icon`} />
    <Text.Body.Normal
      className={cn(
        sx({
          color: '$text_primary',
        }),
        { [`${styles.disabled}`]: disabled },
      )}
      weight="$bold"
      data-testid={`${testId}-title`}
    >
      {title}
    </Text.Body.Normal>
    <Text.Body.Small
      weight="$semibold"
      className={cn(styles.description, { [`${styles.disabled}`]: disabled })}
      data-testid={`${testId}-description`}
    >
      {description}
    </Text.Body.Small>
    <Box mt="$24" w="$fill">
      <Button.Primary data-testid={`${testId}-button`} onClick={onClick} label={button} w="$fill" disabled={disabled} />
    </Box>
  </Flex>
);
