import { senderOrigin } from '@cardano-sdk/dapp-connector';
import { Wallet } from '@lace/cardano';
import { getRandomIcon } from '@lace/common';
import uniqueId from 'lodash/uniqueId';
import { tabs, Runtime } from 'webextension-polyfill';
import { catchAndBrandExtensionApiError } from '@utils/catch-and-brand-extension-api-error';

export const senderToDappInfo = async (sender: Runtime.MessageSender): Promise<Wallet.DappInfo> => {
  if (!sender.tab?.id) throw new Error('Unknown sender tab id');
  // Tab info might've changed. It used to fail e2e tests when using data from 'sender.tab'.
  // It would be better if SDK waited for tab to load before emitting events with sender.
  const tab = await catchAndBrandExtensionApiError(
    tabs.get(sender.tab?.id),
    `Failed to get tab data of a DApp with url ${sender.url}`
  );
  return {
    url: senderOrigin(sender),
    logo: tab.favIconUrl || getRandomIcon({ id: uniqueId(), size: 40 }),
    name: tab.title || tab.url.split('//')[1].trim()
  };
};
