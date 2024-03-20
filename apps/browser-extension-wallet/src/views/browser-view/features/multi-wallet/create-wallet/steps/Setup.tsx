import { WalletSetupNamePasswordStep } from '@lace/core';
import { walletRoutePaths } from '@routes';
import React from 'react';
import { useHistory } from 'react-router';
import { useCreateWallet } from '../context';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@lace/common';

export const Setup = (): JSX.Element => {
  const history = useHistory();
  const { setName, setPassword, onChange, data } = useCreateWallet();
  const analytics = useAnalyticsContext();

  return (
    <WalletSetupNamePasswordStep
      initialWalletName={data.name}
      onChange={onChange}
      onBack={() => history.push(walletRoutePaths.newWallet.root)}
      onNext={({ password, walletName }) => {
        analytics.sendEventToPostHog(PostHogAction.MultiWalletCreateWalletNamePasswordNextClick);
        setName(walletName);
        setPassword(password);
        history.push(walletRoutePaths.newWallet.create.keepSecure);
      }}
    />
  );
};
