import { Flex, ProfilePicture, Text } from '@input-output-hk/lace-ui-toolkit';
import React from 'react';

import styles from './DappInfo.module.scss';

interface DappInfoProps {
  imageUrl: string;
  name: string;
  url: string;
}

export const DappInfo = ({ imageUrl, url, name }: DappInfoProps) => {
  return (
    <Flex alignItems="center" gap="$8" mb="$16">
      <ProfilePicture.UserProfile
        imageSrc={imageUrl}
        fallbackText={name}
        delayMs={0}
        fallbackImage={imageUrl}
        testId="dapp-info-logo"
      />
      <Flex flexDirection="column">
        <Text.Body.Normal
          weight="$bold"
          className={styles.preventOverflow}
          data-testid="dapp-info-name">
          {name}
        </Text.Body.Normal>
        <Text.Body.Normal
          className={styles.preventOverflow}
          data-testid="dapp-info-url">
          {url}
        </Text.Body.Normal>
      </Flex>
    </Flex>
  );
};
