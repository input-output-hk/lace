import { ViewId } from '@lace-contract/module';
import { viewsActions as actions } from '@lace-contract/views';
import { testSideEffect } from '@lace-lib/util-dev';
import { EMPTY } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  connectView,
  disconnectView,
  openView,
} from '../../src/store/side-effects';

import type {
  ConnectedView,
  ObservableExtensionViewApi,
} from '../../src/store';
import type { View } from '@lace-contract/views';
import type { Observable } from 'rxjs';

const sidePanelView: View = {
  id: ViewId(123),
  type: 'sidePanel',
  location: '/onboarding',
};

describe('views-extension/store/side-effects', () => {
  describe('connectView', () => {
    it('should dispatch viewConnected action on successful connection', () => {
      testSideEffect(connectView, ({ flush, hot, expectObservable }) => {
        const dependencies = {
          viewConnect$: hot<ConnectedView>('-a', {
            a: {
              view: sidePanelView,
              api: {
                close: (): Observable<void> => EMPTY,
              } as ObservableExtensionViewApi,
            },
          }),
          actions,
        };

        return {
          actionObservables: {
            views: { viewDisconnected$: hot(''), closeView$: hot('') },
          },
          dependencies,
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-(a)', {
              a: actions.views.viewConnected(sidePanelView),
            });

            flush();
          },
        };
      });
    });

    it('should maintain connection until viewDisconnected action is received', () => {
      testSideEffect(connectView, ({ flush, hot, expectObservable }) => {
        const closeMock = vi.fn((): Observable<void> => {
          return EMPTY;
        });
        const viewConnect$ = hot<ConnectedView>('a', {
          a: {
            view: sidePanelView,
            api: {
              close: closeMock as ObservableExtensionViewApi['close'],
            } as ObservableExtensionViewApi,
          },
        });

        const dependencies = { viewConnect$, actions };

        return {
          actionObservables: {
            views: {
              viewDisconnected$: hot('-------d', {
                d: actions.views.viewDisconnected(sidePanelView.id),
              }),
              closeView$: hot('---c----', {
                c: actions.views.closeView(sidePanelView.id),
              }),
            },
          },
          dependencies,
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a----', {
              a: actions.views.viewConnected(sidePanelView),
            });

            flush();

            expect(closeMock).toHaveBeenCalled();
          },
        };
      });
    });
  });

  describe('disconnectView', () => {
    it('should emit viewDisconnected action with the correct view id when a view is emitted from viewDisconnect$', () => {
      testSideEffect(disconnectView, ({ hot, expectObservable }) => {
        return {
          dependencies: {
            viewDisconnect$: hot('a', { a: sidePanelView.id }),
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.views.viewDisconnected(sidePanelView.id),
            });
          },
        };
      });
    });
  });

  describe('openView', () => {
    it("should call openPopupWindow with the correct location when an openView action of type 'popupWindow' is received", () => {
      const openPopupWindowMock = vi.fn(() => EMPTY);

      testSideEffect(openView, ({ flush, hot, expectObservable }) => {
        const dependencies = {
          openPopupWindow: openPopupWindowMock,
          actions,
        };

        return {
          actionObservables: {
            views: {
              openView$: hot('-a', {
                a: actions.views.openView({
                  type: 'popupWindow',
                  location: '/some-location',
                }),
              }),
            },
          },
          stateObservables: {
            views: {
              selectOpenViews$: hot('a', { a: [] as View[] }),
            },
          },
          dependencies,
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');

            flush();

            expect(openPopupWindowMock).toHaveBeenCalledWith('/some-location');
          },
        };
      });
    });

    it('should call highlightTab when an existing popup window for the location is already open', () => {
      const highlightTabMock = vi.fn(() => EMPTY);
      const openPopupWindowMock = vi.fn(() => EMPTY);
      const existingPopupView: View = {
        id: ViewId(456),
        type: 'popupWindow',
        location: '/some-location',
      };

      testSideEffect(openView, ({ flush, hot, expectObservable }) => {
        const dependencies = {
          highlightTab: highlightTabMock,
          openPopupWindow: openPopupWindowMock,
          actions,
        };

        return {
          actionObservables: {
            views: {
              openView$: hot('-a', {
                a: actions.views.openView({
                  type: 'popupWindow',
                  location: '/some-location',
                }),
              }),
            },
          },
          stateObservables: {
            views: {
              selectOpenViews$: hot('a', { a: [existingPopupView] }),
            },
          },
          dependencies,
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');

            flush();

            expect(highlightTabMock).toHaveBeenCalledWith(456);
            expect(openPopupWindowMock).not.toHaveBeenCalled();
          },
        };
      });
    });

    it('should log an error for unsupported view types and produce no output', () => {
      const openPopupWindowMock = vi.fn(() => EMPTY);
      const loggerMock = {
        error: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
      };

      testSideEffect(openView, ({ flush, hot, expectObservable }) => {
        const dependencies = {
          openPopupWindow: openPopupWindowMock,
          logger: loggerMock,
          actions,
        };

        return {
          actionObservables: {
            views: {
              openView$: hot('-a', {
                a: actions.views.openView({
                  type: 'mobile' as const,
                  location: '/some-location',
                }),
              }),
            },
          },
          stateObservables: {
            views: {
              selectOpenViews$: hot('a', { a: [] as View[] }),
            },
          },
          state$: EMPTY,
          dependencies,
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');

            flush();

            expect(openPopupWindowMock).not.toHaveBeenCalled();
            expect(loggerMock.error).toHaveBeenCalledWith(
              'Opening view of type "mobile" is not supported',
            );
          },
        };
      });
    });
  });
});
