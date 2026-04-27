import { ViewId } from '@lace-contract/module';
import { SidePanelViewId } from '@lace-contract/views';
import {
  FinalizationRegistryDestructor,
  RemoteApiShutdownError,
  consumeMessengerRemoteApi,
  generalizeBackgroundMessenger,
  getBackgroundMessenger,
} from '@lace-sdk/extension-messaging';
import {
  catchError,
  combineLatest,
  EMPTY,
  filter,
  from,
  map,
  mergeMap,
  share,
  shareReplay,
  takeUntil,
} from 'rxjs';
import { management, runtime, tabs, windows } from 'webextension-polyfill';

import { CONNECTION_CHANNEL } from '../const';
import { extensionViewApiProperties } from '../messaging';

import type { ExtensionViewApi } from '../messaging';
import type { LaceInitSync } from '@lace-contract/module';
import type { View } from '@lace-contract/views';
import type { OpenViewPayload, ViewLocation } from '@lace-contract/views';
import type { MinimalPort } from '@lace-sdk/extension-messaging';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';
import type { Runtime } from 'webextension-polyfill';

type PromiseToObservableReturnType<T> = T extends (
  ...args: infer Args
) => Promise<infer R>
  ? (...args: Args) => Observable<R>
  : T;
export type ObservableExtensionViewApi = {
  [k in keyof ExtensionViewApi]: PromiseToObservableReturnType<
    ExtensionViewApi[k]
  >;
};

export type ConnectedView = {
  api: ObservableExtensionViewApi;
  view: View;
};

export type ViewsExtensionDependencies = {
  highlightTab: (tabId: number) => Observable<void>;
  openPopupWindow: (
    location: Readonly<OpenViewPayload['location']>,
  ) => Observable<void>;
  viewConnect$: Observable<ConnectedView>;
  viewDisconnect$: Observable<ViewId>;
};

const urlToViewLocation = (url: string): ViewLocation => {
  const parsedUrl = new URL(url, 'http://does-not-matter.url');
  return parsedUrl.hash.replace('#', '') || '/';
};

const isPopupWindow = async (windowId?: number): Promise<boolean | null> => {
  if (!windowId) {
    return false;
  }
  const currentWindow = await windows.get(windowId);
  return currentWindow.type === 'popup';
};

type MapSender<T> = (sender: Runtime.MessageSender) => Observable<T>;
const senderToView =
  (logger: Logger): MapSender<View> =>
  sender =>
    from(
      (async (): Promise<View> => {
        const url = sender.url!;
        const location = urlToViewLocation(url);
        if (sender?.tab?.id) {
          const isPopup = await isPopupWindow(sender?.tab?.windowId);
          if (isPopup) {
            return {
              id: ViewId(sender.tab.id),
              location,
              type: 'popupWindow',
            };
          }
        }
        // Side panel views don't have a tab ID — identify by window
        const windowId =
          sender?.tab?.windowId ?? (await windows.getCurrent().then(w => w.id));
        return {
          id: SidePanelViewId(windowId!),
          location,
          type: 'sidePanel',
          windowId: windowId!,
        };
      })(),
    ).pipe(
      catchError(error => {
        logger.error(error);
        return EMPTY;
      }),
    );
const senderToViewId: MapSender<ViewId> = sender =>
  from(
    (async () => {
      if (sender?.tab?.id) {
        return ViewId(sender.tab.id);
      }
      const windowId =
        sender?.tab?.windowId ?? (await windows.getCurrent().then(w => w.id));
      return SidePanelViewId(windowId!);
    })(),
  );

const ignoreRemoteApiShutdownError = (error: unknown) => {
  if (error instanceof RemoteApiShutdownError) {
    return;
  }
  throw error;
};

const selfExtensionConnections =
  <T>(extensionId$: Readonly<Observable<string>>, mapSender: MapSender<T>) =>
  (source$: Readonly<Observable<MinimalPort>>) =>
    combineLatest([source$, extensionId$]).pipe(
      filter(
        ([{ sender }, extensionId]) =>
          sender?.id === extensionId && !!sender?.url,
      ),
      mergeMap(([{ sender }]): Observable<T> => mapSender(sender!)),
    );

export const initializeDependencies: LaceInitSync<
  ViewsExtensionDependencies
> = (_, { logger }) => {
  const backgroundMessenger = generalizeBackgroundMessenger(
    CONNECTION_CHANNEL,
    getBackgroundMessenger({ logger, runtime }),
    logger,
  );
  const extensionId$ = from(management.getSelf()).pipe(
    map(({ id }) => id),
    shareReplay(1),
  );
  const viewDisconnect$ = backgroundMessenger.disconnect$.pipe(
    map(({ disconnected }) => disconnected),
    selfExtensionConnections(extensionId$, senderToViewId),
    share(),
  );
  const viewConnect$ = backgroundMessenger.connect$.pipe(
    selfExtensionConnections(extensionId$, senderToView(logger)),
    map((view): ConnectedView => {
      const api = consumeMessengerRemoteApi(
        { properties: extensionViewApiProperties },
        {
          logger,
          messenger: backgroundMessenger.deriveChannel(view.id.toString()),
          destructor: new FinalizationRegistryDestructor(logger),
        },
      );
      return {
        view,
        api: {
          callHistoryMethod: payload =>
            from(
              api
                .callHistoryMethod(payload)
                .catch(ignoreRemoteApiShutdownError),
            ),
          close: () => from(api.close().catch(ignoreRemoteApiShutdownError)),
          locationChanged$: api.locationChanged$.pipe(
            takeUntil(
              viewDisconnect$.pipe(
                filter(disconnectedView => disconnectedView === view.id),
              ),
            ),
          ),
          keepAlive: () =>
            from(api.keepAlive().catch(ignoreRemoteApiShutdownError)),
        },
      };
    }),
    share(),
  );

  return {
    viewConnect$: viewConnect$,
    viewDisconnect$: viewDisconnect$,
    highlightTab: (tabId: number) =>
      from(
        (async () => {
          try {
            const tab = await tabs.get(tabId);
            await tabs.highlight({ windowId: tab.windowId, tabs: [tab.index] });
          } catch {
            logger.error('Failed to highlight tab', tabId);
          }
        })(),
      ),
    openPopupWindow: location =>
      from(
        (async () => {
          try {
            const hash = location === '/' ? '' : `#${location}`;
            const win = await windows.create({
              url: `expo/index.html${hash}`,
              type: 'popup',
              width: 360,
              height: 650,
            });

            // In some platforms Chrome ignores dimensions on windows.create, so we create first
            // then immediately update with the correct size
            if (win?.id) {
              await windows.update(win.id, {
                width: 360,
                height: 650,
              });
            }
          } catch {
            logger.error('Failed to open popup window', location);
          }
        })(),
      ),
  };
};
