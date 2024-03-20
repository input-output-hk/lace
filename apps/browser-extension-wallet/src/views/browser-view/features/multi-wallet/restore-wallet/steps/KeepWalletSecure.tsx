import React from 'react';
import { useHistory } from 'react-router';
import { KeepWalletSecure as View } from '../../components';
import { walletRoutePaths } from '@routes';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@lace/common';

const {
  newWallet: { restore }
} = walletRoutePaths;

export const KeepWalletSecure = (): JSX.Element => {
  const history = useHistory();
  const analytics = useAnalyticsContext();

  return (
    <View
      onBack={() => history.goBack()}
      onNext={() => {
        analytics.sendEventToPostHog(PostHogAction.MultiwalletRestorePassphraseIntroNextClick);
        history.push(restore.selectRecoveryPhraseLength);
      }}
      onVideoClick={() => {
        analytics.sendEventToPostHog(PostHogAction.MultiWalletRestorePassphraseIntroPlayVideoClick);
      }}
    />
  );
};
