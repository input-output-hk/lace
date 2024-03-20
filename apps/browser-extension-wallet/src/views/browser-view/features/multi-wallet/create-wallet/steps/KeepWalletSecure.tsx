import React from 'react';
import { useHistory } from 'react-router';
import { KeepWalletSecure as View } from '../../components';
import { walletRoutePaths } from '@routes';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@lace/common';

const {
  newWallet: { create }
} = walletRoutePaths;

export const KeepWalletSecure = (): JSX.Element => {
  const history = useHistory();
  const analytics = useAnalyticsContext();

  return (
    <View
      onBack={() => history.goBack()}
      onNext={() => {
        analytics.sendEventToPostHog(PostHogAction.MultiwalletCreatePassphraseIntroNextClick);
        history.push(create.recoveryPhrase);
      }}
      onVideoClick={() => {
        analytics.sendEventToPostHog(PostHogAction.MultiWalletCreatePassphraseIntroPlayVideoClick);
      }}
    />
  );
};
