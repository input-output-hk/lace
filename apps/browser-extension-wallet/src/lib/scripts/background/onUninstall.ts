import { runtime } from 'webextension-polyfill';

const uninstallRedirect = process.env.LACE_EXTENSION_UNINSTALL_REDIRECT_URL;

if (uninstallRedirect !== undefined) {
  runtime.setUninstallURL(uninstallRedirect);
}
