import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { useHardwareWallet } from '../context';
import { ErrorDialog } from '../../../wallet-setup/components/ErrorDialog';
import { walletRoutePaths } from '@routes';

type Errors = 'notDetectedLedger' | 'notDetectedTrezor' | 'common';

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
    const subscription = disconnectHardwareWallet$.subscribe((event: HIDConnectionEvent) => {
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
