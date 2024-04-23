import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { useHardwareWallet } from '../context';
import { makeErrorDialog } from '../../../wallet-setup/components/HardwareWalletFlow';
import { walletRoutePaths } from '@routes';

type Errors = 'notDetectedLedger' | 'notDetectedTrezor' | 'common';

const ErrorDialog = makeErrorDialog<Errors>({
  common: {
    title: 'multiWallet.errorDialog.commonError.title',
    description: 'multiWallet.errorDialog.commonError.description',
    confirm: 'multiWallet.errorDialog.commonError.ok'
  },
  notDetectedLedger: {
    title: 'multiWallet.errorDialog.notDetectedError.title',
    description: 'multiWallet.errorDialog.notDetectedError.description',
    confirm: 'multiWallet.errorDialog.notDetectedError.agree'
  },
  notDetectedTrezor: {
    title: 'multiWallet.errorDialog.notDetectedError.title',
    description: 'multiWallet.errorDialog.notDetectedError.trezorDescription',
    confirm: 'multiWallet.errorDialog.notDetectedError.agree'
  }
});

interface State {
  error?: Errors;
}

interface Props {
  error?: Errors;
  onRetry?: () => void;
}

export const ErrorHandling = ({ error, onRetry }: Props): JSX.Element => {
  const history = useHistory();
  const { resetConnection, disconnectHardwareWallet$ } = useHardwareWallet();
  const [state, setState] = useState<State>({});

  useEffect(() => {
    const subscription = disconnectHardwareWallet$.subscribe((event: USBConnectionEvent) => {
      if (event.device.opened) {
        setState({ error: 'common' });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [disconnectHardwareWallet$]);

  const resetStates = () => {
    setState({ error: undefined });
    resetConnection();
    onRetry();
    history.push(walletRoutePaths.newWallet.hardware.connect);
  };

  const errorMsg = state.error || error;

  return <>{errorMsg !== undefined && <ErrorDialog visible onRetry={resetStates} errorCode={errorMsg} />}</>;
};
