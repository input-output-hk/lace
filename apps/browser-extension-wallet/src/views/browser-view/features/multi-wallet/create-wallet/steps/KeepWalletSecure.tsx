import React from 'react';
import { useHistory } from 'react-router';
import { KeepWalletSecure as View } from '../../components';
import { useCreateWallet } from '@views/browser/features/multi-wallet/create-wallet/context';

const noop = (): void => void 0;

export const KeepWalletSecure = (): JSX.Element => {
  const history = useHistory();
  const { paths } = useCreateWallet();

  return (
    <View
      onBack={() => history.goBack()}
      onNext={() => history.push(paths.create.recoveryPhrase)}
      onVideoClick={noop}
    />
  );
};
