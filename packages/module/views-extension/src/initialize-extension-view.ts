import { typedLaceContext } from '@lace-contract/module';
import {
  createNonBackgroundMessenger,
  exposeMessengerApi,
} from '@lace-lib/extension-messaging';
import { createBrowserHistory } from 'history';
import { Observable, of } from 'rxjs';
import { runtime } from 'webextension-polyfill';

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
};

const initializeExtensionView: ContextualLaceInit<
  InitializeExtensionView,
  AvailableAddons
> =
  ({ viewId }, { logger }) =>
  async (_store, context) => {
    typedLaceContext<Selectors, ActionCreators>(context);

    if (!viewId) {
      logger.error('Initialize extension view: missing viewId');
      return;
    }

    const messenger = createNonBackgroundMessenger(
      { baseChannel: CONNECTION_CHANNEL },
      { logger, runtime },
    ).deriveChannel(viewId.toString());

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
