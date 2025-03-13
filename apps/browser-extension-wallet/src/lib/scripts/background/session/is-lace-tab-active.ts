import { distinctUntilChanged, from, fromEventPattern, map, merge, share, startWith, switchMap } from 'rxjs';
import { runtime, Tabs, tabs, windows } from 'webextension-polyfill';
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

/**
 * Get the extension tab pattern url.
 * For Chrome, it will be 'chrome-extension://<extension-id>/*'
 * and for Firefox, it will be 'moz-extension://<internal-uuid>/*'
 *
 * @returns {string} extension tab pattern url
 */
const getExtensionTabUrlPattern = () => {
  const url = new URL(runtime.getURL(''));
  return `${url.origin}/*`;
};

export const isLaceTabActive$ = merge(windowRemoved$, tabUpdated$, tabActivated$).pipe(
  switchMap(() =>
    from(
      catchAndBrandExtensionApiError(
        tabs.query({
          active: true,
          url: getExtensionTabUrlPattern()
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
