import { LACE_EXTENSION_ID } from '@src/features/nami-migration/migration-tool/cross-extension-messaging/nami/environment';
import { distinctUntilChanged, from, fromEventPattern, map, merge, share, startWith, switchMap } from 'rxjs';
import { Tabs, tabs, windows } from 'webextension-polyfill';
import { catchAndBrandExtensionApiError } from '@utils/catch-and-brand-extension-api-error';

type WindowId = number;

const windowRemoved$ = fromEventPattern<WindowId>(
  (handler) => windows.onRemoved.addListener(handler),
  (handler) => windows.onRemoved.removeListener(handler)
);
const tabUpdated$ = fromEventPattern(
  (handler) => tabs.onUpdated.addListener(handler),
  (handler) => tabs.onUpdated.removeListener(handler),
  (tabId: number, changeInfo: Tabs.OnUpdatedChangeInfoType, tab: Tabs.Tab) => ({ tabId, changeInfo, tab })
);
const tabActivated$ = fromEventPattern<Tabs.OnActivatedActiveInfoType>(
  (handler) => tabs.onActivated.addListener(handler),
  (handler) => tabs.onActivated.removeListener(handler)
);

export const isLaceTabActive$ = merge(windowRemoved$, tabUpdated$, tabActivated$).pipe(
  switchMap(() =>
    from(
      catchAndBrandExtensionApiError(
        tabs.query({
          active: true,
          url: `chrome-extension://${LACE_EXTENSION_ID}/*`
        }),
        'Failed to query for currently active lace tab'
      )
    )
  ),
  map((activeLaceTabs) => activeLaceTabs.length > 0),
  startWith(false),
  distinctUntilChanged(),
  share()
);
