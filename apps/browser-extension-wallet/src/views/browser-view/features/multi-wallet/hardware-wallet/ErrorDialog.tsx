import { makeErrorDialog } from '@views/browser/features/wallet-setup/components/HardwareWalletFlow';
import { ErrorDialogCode } from './types';

const commonErrorDialogTranslationKeys = {
  title: 'browserView.onboarding.errorDialog.title' as const,
  confirm: 'browserView.onboarding.errorDialog.cta' as const
};
export const ErrorDialog = makeErrorDialog<ErrorDialogCode>({
  [ErrorDialogCode.DeviceDisconnected]: {
    ...commonErrorDialogTranslationKeys,
    description: 'browserView.onboarding.errorDialog.messageDeviceDisconnected'
  },
  [ErrorDialogCode.PublicKeyExportRejected]: {
    ...commonErrorDialogTranslationKeys,
    description: 'browserView.onboarding.errorDialog.messagePublicKeyExportRejected'
  },
  [ErrorDialogCode.Generic]: {
    ...commonErrorDialogTranslationKeys,
    description: 'browserView.onboarding.errorDialog.messageGeneric'
  }
});
