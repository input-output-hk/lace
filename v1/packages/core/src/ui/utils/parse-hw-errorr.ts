import { Wallet } from '@lace/cardano';
import { isTimeoutError } from '../hooks';

export type ConnectionError =
  | 'userGestureRequired'
  | 'devicePickerRejected'
  | 'deviceLocked'
  | 'deviceBusy'
  | 'cardanoAppNotOpen'
  | 'unauthorizedTx'
  | 'generic';

export const parseConnectionError = (error: Error): ConnectionError => {
  if (error instanceof DOMException) {
    if (error.message.includes('user gesture')) return 'userGestureRequired';
    if (error.message.includes('No device selected')) return 'devicePickerRejected';
  }
  if (isTimeoutError(error)) return 'deviceBusy';
  if (error.message.includes('Cannot communicate with Ledger Cardano App')) {
    if (error.message.includes('General error 0x5515')) return 'deviceLocked';
    if (error.message.includes('General error 0x6e01')) return 'cardanoAppNotOpen';
  }
  if (error instanceof Wallet.KeyManagement.errors.AuthenticationError) return 'unauthorizedTx';

  if (error instanceof Error && error.message.includes('No device selected')) return 'devicePickerRejected';

  return 'generic';
};
