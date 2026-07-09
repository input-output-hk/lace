import { getI18n } from '@lace-contract/i18n';
import { createUsbPickerExtensionBridge } from '@lace-lib/util-hw/extension';

import type { RequestHWConnection } from '@lace-lib/util-hw';

const loadRequestHWConnectionWeb = (): RequestHWConnection =>
  createUsbPickerExtensionBridge(
    () => ({
      message: getI18n().t('onboarding.hardware-wallet.usb-picker.message'),
      buttonLabel: getI18n().t('onboarding.hardware-wallet.usb-picker.button'),
    }),
    'hw-usb-picker.html',
  );

export default loadRequestHWConnectionWeb;
