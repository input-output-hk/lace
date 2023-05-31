import { runtime, tabs } from 'webextension-polyfill';

// Handling messages from usb permissions iframe

const url = 'https://connect.trezor.io/8/';

/* Handling messages from usb permissions iframe */
const switchToPopupTab = async (event?: BeforeUnloadEvent) => {
  window.removeEventListener('beforeunload', switchToPopupTab);

  if (!event) {
    // triggered from 'usb-permissions-close' message
    // close current tab
    const currentTabs = await tabs.query({
      currentWindow: true,
      active: true
    });
    if (currentTabs.length < 0) return;
    await tabs.remove(currentTabs[0].id);
  }

  // find tab by popup pattern and switch to it
  const currentTabs = await tabs.query({
    url: `${url}popup.html`
  });
  if (currentTabs.length < 0) return;
  tabs.update(currentTabs[0].id, { active: true });
};

window.addEventListener('message', async (event) => {
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
      '*'
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
  instance.setAttribute('src', `${url}extension-permissions.html`);
  instance.setAttribute('allow', 'usb');

  if (document.body) {
    document.body.append(instance);
  }
});
