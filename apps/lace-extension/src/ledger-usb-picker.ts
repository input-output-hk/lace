/**
 * Minimal page opened in a popup window to run navigator.usb.requestDevice().
 *
 * Side panels cannot show the WebUSB device chooser (Chromium only creates
 * WebContentsModalDialogManager for popup view types). This page runs in a
 * popup window where the chooser works, posts the selected device descriptor
 * back via BroadcastChannel, then closes itself.
 *
 * URL hash format: #<encodeURIComponent(JSON.stringify(UsbPickerParams))>
 */

import type {
  UsbPickerError,
  UsbPickerParams,
  UsbPickerSuccess,
} from '@lace-lib/util-hw/extension';

const params: UsbPickerParams = (() => {
  try {
    return JSON.parse(
      decodeURIComponent(location.hash.slice(1)),
    ) as UsbPickerParams;
  } catch {
    // eslint-disable-next-line no-console
    console.error('[ledger-usb-picker] Bad params in URL hash');
    window.close();
    throw new Error('Bad params');
  }
})();

document.getElementById('message')!.textContent = params.labels.message;
const button = document.getElementById('connect') as HTMLButtonElement;
button.textContent = params.labels.buttonLabel;
button.addEventListener('click', () => {
  button.disabled = true;
  const channel = new BroadcastChannel(params.channel);

  navigator.usb
    .requestDevice({ filters: params.filters })
    .then(device => {
      channel.postMessage({
        type: 'success',
        vendorId: device.vendorId,
        productId: device.productId,
        serialNumber: device.serialNumber,
      } satisfies UsbPickerSuccess);
    })
    .catch((error: unknown) => {
      channel.postMessage({
        type: 'error',
        name: error instanceof Error ? error.name : 'Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      } satisfies UsbPickerError);
    })
    .finally(() => {
      channel.close();
      window.close();
    });
});
