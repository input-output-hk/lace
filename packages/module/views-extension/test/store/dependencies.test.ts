import { SidePanelViewId } from '@lace-contract/views';
import {
  consumeMessengerRemoteApi,
  generalizeBackgroundMessenger,
} from '@lace-sdk/extension-messaging';
import { NEVER, Subject, firstValueFrom } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { management, tabs, windows } from 'webextension-polyfill';

import initializeStore from '../../src/store/init';

import type { ViewsExtensionDependencies } from '../../src/store';
import type { ModuleInitProps } from '@lace-contract/module';
import type { View } from '@lace-contract/views';
import type {
  DisconnectEvent,
  MinimalPort,
} from '@lace-sdk/extension-messaging';
import type { Mock } from 'vitest';

const mockApi = {
  close: vi.fn(async () => Promise.resolve()),
  shutdown: vi.fn(),
  locationChanged$: NEVER,
};

vi.mock('@lace-sdk/extension-messaging', async () => {
  const actual = await vi.importActual('@lace-sdk/extension-messaging');

  return {
    __esModule: true,
    ...actual,
    getBackgroundMessenger: vi.fn(),
    generalizeBackgroundMessenger: vi.fn(),
    consumeMessengerRemoteApi: vi.fn(() => mockApi),
  };
});

vi.mock('webextension-polyfill', () => ({
  management: {
    getSelf: vi.fn(),
  },
  tabs: {
    get: vi.fn().mockResolvedValue({ index: 3, windowId: 10 }),
    highlight: vi.fn().mockResolvedValue({ focused: true }),
    create: vi
      .fn()
      .mockImplementation(
        async ({ url, active }: { url: string; active: boolean }) =>
          Promise.resolve({ id: 1, url, active }),
      ),
    query: vi.fn().mockResolvedValue([{ id: 1 }]),
  },
  windows: {
    create: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue({ id: 1 }),
    get: vi.fn(),
    getCurrent: vi.fn().mockResolvedValue({ id: 42 }),
  },
  runtime: {},
}));

describe('views-extension/dependencies', () => {
  const extensionId = 'extension-id';
  const mockWindowId = 42;
  const sidePanelViewId = SidePanelViewId(mockWindowId);
  let dependencies: ViewsExtensionDependencies;
  let messenger: {
    connect$: Subject<MinimalPort>;
    deriveChannel: Mock;
    disconnect$: Subject<DisconnectEvent>;
  };

  beforeEach(async () => {
    (management.getSelf as Mock).mockResolvedValueOnce({
      id: extensionId,
    });

    messenger = {
      connect$: new Subject(),
      disconnect$: new Subject(),
      deriveChannel: vi.fn(path => ({
        channel: `${path}`,
      })),
    };

    (generalizeBackgroundMessenger as Mock).mockReturnValueOnce(messenger);
    const store = await initializeStore({} as ModuleInitProps, {
      logger: dummyLogger,
    });
    dependencies = store.sideEffectDependencies as ViewsExtensionDependencies;
  });

  describe('connection observables', () => {
    const tabId = 123;
    const expoHtmlFilename = 'expo/index';

    it('emits from viewConnect$ when messenger emits a side panel connection', async () => {
      const connected = firstValueFrom(dependencies.viewConnect$);
      messenger.connect$.next({
        sender: {
          id: extensionId,
          url: `chrome-extension://${extensionId}/${expoHtmlFilename}.html`,
        },
      } as MinimalPort);

      await expect(connected).resolves.toEqual(
        expect.objectContaining({
          view: expect.objectContaining({
            id: sidePanelViewId,
            location: '/',
            type: 'sidePanel',
            windowId: mockWindowId,
          }) as unknown as View,
          api: expect.anything() as unknown,
        }),
      );

      expect(consumeMessengerRemoteApi).toHaveBeenCalledWith(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        { properties: expect.any(Object) },
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          messenger: expect.objectContaining({
            channel: sidePanelViewId,
          }),
        }),
      );
    });

    it('parses location from url hash', async () => {
      const connected = firstValueFrom(dependencies.viewConnect$);
      messenger.connect$.next({
        sender: {
          id: extensionId,
          tab: { id: tabId },
          url: `chrome-extension://${extensionId}/${expoHtmlFilename}.html#/some-location`,
        },
      } as MinimalPort);
      const { view } = await connected;
      expect(view.location).toBe('/some-location');
    });

    it('emits from viewDisconnect$ when messenger emits a disconnect event', async () => {
      const disconnected = firstValueFrom(dependencies.viewDisconnect$);
      messenger.disconnect$.next({
        disconnected: {
          sender: {
            id: extensionId,
            tab: { id: tabId },
            url: `chrome-extension://${extensionId}/${expoHtmlFilename}.html`,
          },
        },
      } as DisconnectEvent);
      await expect(disconnected).resolves.toEqual(tabId);
    });

    describe('popupWindow', () => {
      afterEach(() => {
        (windows.get as Mock).mockRestore();
      });

      it('emits from viewConnect$ when messenger emits a popupWindow connection', async () => {
        (windows.get as Mock).mockResolvedValueOnce({ type: 'popup' });
        const connected = firstValueFrom(dependencies.viewConnect$);
        messenger.connect$.next({
          sender: {
            id: extensionId,
            tab: { id: tabId, windowId: 123 },
            url: `chrome-extension://${extensionId}/${expoHtmlFilename}.html`,
          },
        } as MinimalPort);
        await expect(connected).resolves.toEqual(
          expect.objectContaining({
            view: {
              id: tabId,
              location: '/',
              type: 'popupWindow',
            } as View,
          }),
        );
      });

      it('does not emit from viewConnect$ if window.get fails', async () => {
        (windows.get as Mock).mockRejectedValue(new Error('fail'));
        const connected = firstValueFrom(dependencies.viewConnect$);
        messenger.connect$.next({
          sender: {
            id: extensionId,
            tab: { id: tabId, windowId: 123 },
            url: `chrome-extension://${extensionId}/${expoHtmlFilename}.html`,
          },
        } as MinimalPort);
        await new Promise(resolve => setTimeout(resolve, 1));
        messenger.connect$.next({
          sender: {
            id: extensionId,
            url: `chrome-extension://${extensionId}/${expoHtmlFilename}.html`,
          },
        } as MinimalPort);

        // side panel connection emitted 2nd, so the 1st (popupWindow) connection where window.get failed was ignored
        await expect(connected).resolves.toEqual(
          expect.objectContaining({
            view: expect.objectContaining({
              id: sidePanelViewId,
              location: '/',
              type: 'sidePanel',
              windowId: mockWindowId,
            }) as unknown as View,
          }),
        );
      });

      it('does not call window.get when popup window is disconnected', async () => {
        const disconnected = firstValueFrom(dependencies.viewDisconnect$);
        messenger.disconnect$.next({
          disconnected: {
            sender: {
              id: extensionId,
              tab: { id: tabId, windowId: 123 },
              url: `chrome-extension://${extensionId}/${expoHtmlFilename}.html`,
            },
          },
        } as DisconnectEvent);
        await expect(disconnected).resolves.toEqual(tabId);
        expect(windows.get).not.toHaveBeenCalled();
      });
    });
  });

  describe('highlightTab', () => {
    it('calls web-extension api tabs.highlight', async () => {
      const tabId = 123;
      await firstValueFrom(dependencies.highlightTab(tabId));

      expect(tabs.get).toHaveBeenCalledWith(tabId);
      expect(tabs.highlight).toHaveBeenCalledWith({ windowId: 10, tabs: [3] });
    });

    describe('Swallow errors', () => {
      beforeEach(() => {
        vi.spyOn(tabs, 'highlight').mockRejectedValue(
          new Error('Failed to highlight tab'),
        );
      });

      afterEach(() => {
        vi.restoreAllMocks();
      });

      it('swallows the error', async () => {
        const tabId = 123;

        await expect(
          firstValueFrom(dependencies.highlightTab(tabId)),
        ).resolves.toBeUndefined();
      });
    });
  });

  describe('openPopupWindow', () => {
    beforeEach(() => {
      vi.mocked(windows.create)
        .mockClear()
        .mockResolvedValue({ id: 1 } as Awaited<
          ReturnType<typeof windows.create>
        >);
      vi.mocked(windows.update)
        .mockClear()
        .mockResolvedValue({} as Awaited<ReturnType<typeof windows.update>>);
    });

    it('calls web-extension api windows.create then windows.update with dimensions', async () => {
      await firstValueFrom(dependencies.openPopupWindow('/some-location'));

      expect(windows.create).toHaveBeenCalledWith({
        url: `expo/index.html#/some-location`,
        type: 'popup',
        width: 360,
        height: 650,
      });
      expect(windows.update).toHaveBeenCalledWith(1, {
        width: 360,
        height: 650,
      });
    });

    describe('Swallow errors', () => {
      beforeEach(() => {
        vi.spyOn(windows, 'create').mockRejectedValue(
          new Error('Failed to create popup window'),
        );
      });

      afterEach(() => {
        vi.restoreAllMocks();
      });

      it('swallows the error', async () => {
        await expect(
          firstValueFrom(dependencies.openPopupWindow('/some-location')),
        ).resolves.toBeUndefined();
      });
    });
  });
});
