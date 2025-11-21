import { runtime, tabs } from 'webextension-polyfill';
import { AllowedOrigins } from './types';
import { catchAndBrandExtensionApiError } from '@utils/catch-and-brand-extension-api-error';
import { logger } from '@lace/common';

const contextualMessage = (msg: string) => `[trezor-usb-permissions] ${msg}`;

/* Handling messages from usb permissions iframe */
const switchToPopupTab = async (event?: BeforeUnloadEvent) => {
  window.removeEventListener('beforeunload', switchToPopupTab);

  try {
    if (!event) {
      // triggered from 'usb-permissions-close' message
      // close current tab
      const currentTabs = await catchAndBrandExtensionApiError(
        tabs.query({
          currentWindow: true,
          active: true
        }),
        contextualMessage('Failed to query for current tab when switching to popup')
      );
      if (currentTabs.length < 0) return;
      await catchAndBrandExtensionApiError(
        tabs.remove(currentTabs[0].id),
        contextualMessage('Failed to remove current tab when switching to popup')
      );
    }

    // find tab by popup pattern and switch to it
    const currentTabs = await catchAndBrandExtensionApiError(
      tabs.query({
        url: `${AllowedOrigins.TREZOR_CONNECT_POPUP_BASE_URL}/popup.html`
      }),
      contextualMessage('Failed to query TREZOR_CONNECT_POPUP tab')
    );
    if (currentTabs.length < 0) return;
    void catchAndBrandExtensionApiError(
      tabs.update(currentTabs[0].id, { active: true }),
      contextualMessage('Failed to switch to the TREZOR_CONNECT_POPUP tab')
    );
  } catch (error) {
    logger.error(error);
  }
};

window.addEventListener('message', async (event) => {
  if (event.origin !== AllowedOrigins.TREZOR_CONNECT) throw new Error('Origin not allowed');

  if (event.data === 'usb-permissions-init') {
    const iframe = document.querySelector('#trezor-usb-permissions');
    if (!iframe || !(iframe instanceof HTMLIFrameElement)) {
      throw new Error('trezor-usb-permissions missing or incorrect dom type');
    }
    iframe.contentWindow.postMessage(
      {
        type: 'usb-permissions-init',
        extension: runtime.id
      },
      event.origin
    );
  } else if (event.data === 'usb-permissions-close') {
    await switchToPopupTab();
  }
});

window.addEventListener('beforeunload', switchToPopupTab);
window.addEventListener('load', () => {
  const instance = document.createElement('iframe');
  instance.id = 'trezor-usb-permissions';
  instance.frameBorder = '0';
  instance.width = '100%';
  instance.height = '100%';
  instance.style.border = '0px';
  instance.style.width = '100%';
  instance.style.height = '100%';
  instance.setAttribute('src', `${AllowedOrigins.TREZOR_CONNECT_POPUP_BASE_URL}/extension-permissions.html`);
  instance.setAttribute('allow', 'usb');

  if (document.body) {
    document.body.append(instance);
  }
});
