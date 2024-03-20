import { WalletSetupNamePasswordStep } from '@lace/core';
import React from 'react';
import { useHistory } from 'react-router';
import { useRestoreWallet } from '../context';
import { walletRoutePaths } from '@routes/wallet-paths';
import { PostHogAction } from '@lace/common';
import { useAnalyticsContext } from '@providers';

export const Setup = (): JSX.Element => {
  const history = useHistory();
  const { setName, setPassword, onChange, data } = useRestoreWallet();
  const analytics = useAnalyticsContext();

  return (
    <WalletSetupNamePasswordStep
      initialWalletName={data.name}
      onChange={onChange}
      onBack={() => history.push(walletRoutePaths.newWallet.root)}
      onNext={({ password, walletName }) => {
        analytics.sendEventToPostHog(PostHogAction.MultiwalletRestoreWalletNamePasswordNextClick);
        setName(walletName);
        setPassword(password);
        history.push(walletRoutePaths.newWallet.restore.keepSecure);
      }}
    />
  );
};
