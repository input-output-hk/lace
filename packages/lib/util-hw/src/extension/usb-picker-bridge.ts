import type {
  HardwareDeviceUsbFilter,
  RequestHWConnection,
  RequestHWConnectionOption,
} from '../types';
import type { DeviceDescriptor } from '../types';

/** BroadcastChannel message sent by the picker page on success. */
export interface UsbPickerSuccess {
  type: 'success';
  vendorId: number;
  productId: number;
  serialNumber: string | null;
}

/** BroadcastChannel message sent by the picker page on failure. */
export interface UsbPickerError {
  type: 'error';
  name: string;
  message: string;
}

type UsbPickerMessage = UsbPickerError | UsbPickerSuccess;

/** UI labels shown in the picker window, resolved via i18n by the caller. */
export interface UsbPickerLabels {
  readonly message: string;
  readonly buttonLabel: string;
}

/** Parameters encoded in the picker page URL hash. Shared between bridge and picker page. */
export interface UsbPickerParams {
  readonly filters: HardwareDeviceUsbFilter[];
  readonly channel: string;
  readonly labels: UsbPickerLabels;
}

const isUsbDeviceRecognized = (
  options: ReadonlyArray<RequestHWConnectionOption>,
  vendorId: number,
  productId: number,
): boolean =>
  options.some(option =>
    (option.usbFilters ?? []).some(
      filter =>
        (filter.vendorId === undefined || filter.vendorId === vendorId) &&
        (filter.productId === undefined || filter.productId === productId),
    ),
  );

/**
 * Create a `requestNewDevice` function for Chrome extensions that opens a
 * picker page via `windows.create` and communicates via BroadcastChannel.
 *
 * The picker page must:
 * 1. Parse `UsbPickerParams` from the URL hash
 * 2. Call `navigator.usb.requestDevice({ filters })` on user gesture
 * 3. Post a `UsbPickerMessage` to the BroadcastChannel and close
 *
 * @param getLabels - factory returning i18n-resolved UI strings; called per
 *   request so locale changes during the session are reflected in the picker
 *   window.
 * @param pickerPageUrl - extension page filename (e.g. 'hw-usb-picker.html')
 */
export const createUsbPickerExtensionBridge = (
  getLabels: () => UsbPickerLabels,
  pickerPageUrl: string,
): RequestHWConnection => {
  return async options => {
    const filters = options.flatMap(option => option.usbFilters ?? []);
    const labels = getLabels();
    // webextension-polyfill is a CJS module. Metro with experimentalImportSupport
    // wraps dynamic imports as { default: module.exports }, so named properties
    // like `windows` are not directly on the module object — access via .default.
    const { default: browser } = await import('webextension-polyfill');
    const { runtime, windows } = browser;

    return new Promise<DeviceDescriptor>((resolve, reject) => {
      const channelName = `usb-picker-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
      const channel = new BroadcastChannel(channelName);

      let windowId: number | undefined;
      let isSettled = false;

      const cleanup = () => {
        channel.close();
        windows.onRemoved.removeListener(onWindowRemoved);
      };

      const settleOnce = (): boolean => {
        if (isSettled) return false;
        isSettled = true;
        cleanup();
        if (windowId !== undefined) {
          windows.remove(windowId).catch(() => {});
        }
        return true;
      };

      const settleResolve = (value: DeviceDescriptor) => {
        if (settleOnce()) resolve(value);
      };

      const settleReject = (error: Error) => {
        if (settleOnce()) reject(error);
      };

      const onWindowRemoved = (removedId: number) => {
        if (removedId === windowId) {
          settleReject(new Error('User closed the device picker'));
        }
      };

      channel.onmessage = (event: MessageEvent<UsbPickerMessage>) => {
        if (event.data.type === 'success') {
          if (
            !isUsbDeviceRecognized(
              options,
              event.data.vendorId,
              event.data.productId,
            )
          ) {
            settleReject(new Error('Could not recognize the device'));
            return;
          }
          settleResolve({
            kind: 'usb',
            vendorId: event.data.vendorId,
            productId: event.data.productId,
            serialNumber: event.data.serialNumber,
          });
        } else {
          settleReject(
            event.data.name === 'NotFoundError'
              ? new DOMException(event.data.message, 'NotFoundError')
              : new Error(event.data.message),
          );
        }
      };

      const hash = encodeURIComponent(
        JSON.stringify({ filters, channel: channelName, labels }),
      );

      windows.onRemoved.addListener(onWindowRemoved);

      // 'popup' type doesn't support WebUSB chooser either — only 'normal' works
      windows
        .create({
          url: runtime.getURL(`${pickerPageUrl}#${hash}`),
          type: 'normal',
          width: 400,
          height: 300,
        })
        .then(win => {
          windowId = win?.id;
        })
        .catch((error: unknown) => {
          settleReject(
            error instanceof Error ? error : new Error(String(error)),
          );
        });
    });
  };
};
