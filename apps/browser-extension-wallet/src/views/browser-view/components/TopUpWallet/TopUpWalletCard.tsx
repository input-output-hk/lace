import React from 'react';
import { TopUpWalletButton } from './TopUpWalletButton';
import { Box, Card, Flex, Text } from '@lace/ui';
import styles from './TopUpWallet.module.scss';

export const TopUpWalletCard = (): React.ReactElement => (
  <div>
    <Box className={styles.scroll}>
      <Text.Body.Normal weight="$medium">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore
        magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
        consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
        pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est
        laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et
        dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
        commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
        pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est
        laborum.
      </Text.Body.Normal>
    </Box>
    <Card.Outlined>
      <Flex flexDirection="column" justifyContent="flex-start" alignItems="stretch" mx="$20" my="$32" gap="$20">
        <Flex gap="$8" alignItems="center">
          <Text.SubHeading weight="$bold">Top up your wallet</Text.SubHeading>
          <div className={styles.titleBadge}>
            <Text.Label className={styles.badgeCaption} weight="$medium">
              New
            </Text.Label>
          </div>
        </Flex>
        <Text.Body.Normal weight="$medium">
          Boost your crypto journey! Fuel your wallet with ADA and ride the wave of potential 🚀
        </Text.Body.Normal>
        <Flex mt="$10" flexDirection="column" alignItems="stretch">
          <TopUpWalletButton />
        </Flex>
      </Flex>
    </Card.Outlined>
  </div>
);
