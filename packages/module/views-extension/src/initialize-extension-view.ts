import { typedLaceContext, type ViewId } from '@lace-contract/module';
import { SidePanelViewId } from '@lace-contract/views';
import {
  createNonBackgroundMessenger,
  exposeMessengerApi,
} from '@lace-sdk/extension-messaging';
import { createBrowserHistory } from 'history';
import { Observable, of } from 'rxjs';
import { runtime, tabs, windows } from 'webextension-polyfill';

import { CONNECTION_CHANNEL } from './const';
import { extensionViewApiProperties } from './messaging';

import type { ActionCreators, AvailableAddons, Selectors } from '.';
import type { ExtensionViewApi } from './messaging';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { InitializeExtensionView } from '@lace-contract/views';

const history = createBrowserHistory();

const extensionViewApi: ExtensionViewApi = {
  close: async () => {
    window.close();
  },
  callHistoryMethod: async ({ args, method }) => {
    history[method](...args);
  },
  locationChanged$: new Observable(subscriber =>
    history.listen(update => {
      subscriber.next(update.location.hash.replace('#', '') || '/');
    }),
  ),
  keepAlive: async () => {},
};

const initializeExtensionView: ContextualLaceInit<
  InitializeExtensionView,
  AvailableAddons
> =
  (_, { logger }) =>
  async (_store, context) => {
    typedLaceContext<Selectors, ActionCreators>(context);

    // Detect view ID: popupWindow has a tab, side panel does not
    const selfTab = await tabs.getCurrent();
    let selfViewId: ViewId;
    if (selfTab?.id) {
      selfViewId = selfTab.id as ViewId;
    } else {
      const currentWindow = await windows.getCurrent();
      selfViewId = SidePanelViewId(currentWindow.id!);
    }

    const messenger = createNonBackgroundMessenger(
      { baseChannel: CONNECTION_CHANNEL },
      { logger, runtime },
    ).deriveChannel(selfViewId.toString());

    try {
      exposeMessengerApi(
        { api$: of(extensionViewApi), properties: extensionViewApiProperties },
        { logger, messenger },
      );
    } catch (error) {
      logger.error('Initialize extension view', error);
    }
  };

export default initializeExtensionView;
