import { ViewId } from '@lace-contract/module';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  viewsSelectors as selectors,
  viewsActions as actions,
} from '../../src';
import { viewsReducers } from '../../src/store/slice';

import type { View, OpenViewPayload, ViewsStoreState } from '../../src';

// Route constants to avoid circular dependency
const StackRoutes = {
  Home: 'Home',
  AccountDetails: 'AccountDetails',
  WalletSettings: 'WalletSettings',
  Collateral: 'Collateral',
  OnboardingStart: 'OnboardingStart',
  OnboardingRestoreWallet: 'OnboardingRestoreWallet',
  OnboardingCreateWallet: 'OnboardingCreateWallet',
  OnboardingHardwareWallet: 'OnboardingHardwareWallet',
} as const;

const SheetRoutes = {
  Initial: 'Initial',
  AddAccount: 'AddAccount',
  RemoveAccount: 'RemoveAccount',
  RemoveAccountSuccess: 'RemoveAccountSuccess',
  AuthorizedDApps: 'AuthorizedDApps',
  Receive: 'Receive',
  AccountKey: 'AccountKey',
  RecoveryPhrase: 'RecoveryPhrase',
  RecoveryPhraseDisplay: 'RecoveryPhraseDisplay',
  RecoveryPhraseVerification: 'RecoveryPhraseVerification',
  SuccessRecoveryPhraseVerification: 'SuccessRecoveryPhraseVerification',
  EditFolder: 'EditFolder',
  HardwareWalletDiscoverySearching: 'HardwareWalletDiscoverySearching',
  HardwareWalletDiscoveryError: 'HardwareWalletDiscoveryError',
  HardwareWalletDiscoveryResults: 'HardwareWalletDiscoveryResults',
  Buy: 'Buy',
  ThemeSelection: 'ThemeSelection',
  Language: 'Language',
  AssetDetailBottomSheet: 'AssetDetailBottomSheet',
  ActivityDetail: 'ActivityDetail',
} as const;

describe('views/slice', () => {
  describe('reducers and actions', () => {
    let initialState: ViewsStoreState['views'];

    beforeEach(() => {
      initialState = {
        open: {},
        colorScheme: 'light',
        activeSheet: null,
        activePage: null,
        activeSheetPage: null,
        language: 'en',
        hasExplicitLanguagePreference: false,
      };
    });

    describe('viewConnected action', () => {
      it('should add a view to the state', () => {
        const newView: View = {
          id: ViewId('view1'),
          type: 'sidePanel',
          location: '/location1',
        };

        const stateAfter = viewsReducers.views(
          initialState,
          actions.views.viewConnected(newView),
        );

        expect(stateAfter.open[newView.id]).toBeDefined();
        expect(stateAfter.open[newView.id]).toEqual(newView);
      });
    });

    describe('viewDisconnected action', () => {
      it('should remove a view from the state based on id', () => {
        const viewId = ViewId('view1');
        initialState = {
          open: {
            [viewId]: {
              id: viewId,
              type: 'sidePanel' as const,
              location: '/location1',
            },
          },
          colorScheme: 'light',
          activeSheet: null,
          activePage: null,
          activeSheetPage: null,
          language: 'en',
          hasExplicitLanguagePreference: false,
        };

        const viewIdToRemove = ViewId('view1');

        const stateAfter = viewsReducers.views(
          initialState,
          actions.views.viewDisconnected(viewIdToRemove),
        );

        expect(stateAfter.open[viewIdToRemove]).toBeUndefined();
        expect(Object.keys(stateAfter.open).length).toBe(0);
      });
    });

    describe('layoutChanged action', () => {
      const viewId = ViewId('view1');
      beforeEach(() => {
        initialState = {
          open: {
            [viewId]: {
              id: viewId,
              type: 'sidePanel' as const,
              location: '/location1',
            },
          },
          colorScheme: 'light',
          activeSheet: null,
          activePage: null,
          activeSheetPage: null,
          language: 'en',
          hasExplicitLanguagePreference: false,
        };
      });

      it('should update the layout of a specific view by id if the view exists', () => {
        const newLocation = '/location2';

        const stateAfter = viewsReducers.views(
          initialState,
          actions.views.locationChanged({ viewId, location: newLocation }),
        );

        expect(stateAfter.open[viewId].location).toEqual(newLocation);
      });

      it('should not do anything if the view does not exist', () => {
        const stateAfter = viewsReducers.views(
          initialState,
          actions.views.locationChanged({
            viewId: ViewId('does-not-exist'),
            location: '/new-location',
          }),
        );

        expect(stateAfter).toEqual(initialState);
      });
    });

    describe('openView action', () => {
      it('should create an action to open a view with specific layout details', () => {
        const payload: OpenViewPayload = {
          type: 'sidePanel',
          location: '/tab-location',
        };

        const action = actions.views.openView(payload);

        expect(action.type).toBe('views/openView');
        expect(action.payload).toEqual(payload);
      });
    });

    describe('closeView action', () => {
      it('should create an action to close a view by id', () => {
        const viewId = ViewId('1234');

        const action = actions.views.closeView(viewId);

        expect(action.type).toBe('views/closeView');
        expect(action.payload).toBe(viewId);
      });
    });

    describe('setColorScheme action', () => {
      it('should create an action to focus on a view by id', () => {
        const state = viewsReducers.views(
          initialState,
          actions.views.setColorScheme('dark'),
        );
        expect(state.colorScheme).toBe('dark');
      });
    });

    describe('setActivePage action', () => {
      it('should set activePage with route and params', () => {
        const pagePayload = {
          route: StackRoutes.AccountDetails,
          params: { walletId: 'wallet-123', accountId: 'account-456' },
        };

        const state = viewsReducers.views(
          initialState,
          actions.views.setActivePage(pagePayload),
        );

        expect(state.activePage).toEqual(pagePayload);
      });

      it('should set activePage with only route', () => {
        const pagePayload = {
          route: StackRoutes.Collateral,
        };

        const state = viewsReducers.views(
          initialState,
          actions.views.setActivePage(pagePayload),
        );

        expect(state.activePage).toEqual(pagePayload);
      });

      it('should update activePage from null to a new page', () => {
        const pagePayload = {
          route: StackRoutes.WalletSettings,
          params: { walletId: 'wallet-123' },
        };

        const state = viewsReducers.views(
          initialState,
          actions.views.setActivePage(pagePayload),
        );

        expect(state.activePage).toEqual(pagePayload);
      });

      it('should update activePage from one page to another', () => {
        const initialPageState = {
          ...initialState,
          activePage: {
            route: StackRoutes.OnboardingStart,
          },
        };

        const newPagePayload = {
          route: StackRoutes.OnboardingRestoreWallet,
        };

        const state = viewsReducers.views(
          initialPageState,
          actions.views.setActivePage(newPagePayload),
        );

        expect(state.activePage).toEqual(newPagePayload);
      });
    });

    describe('setActiveSheetPage action', () => {
      it('should set activeSheetPage with route and params', () => {
        const sheetPagePayload = {
          route: SheetRoutes.RemoveAccount,
          params: { walletId: 'wallet-123', accountId: 'account-456' },
        };

        const state = viewsReducers.views(
          initialState,
          actions.views.setActiveSheetPage(sheetPagePayload),
        );

        expect(state.activeSheetPage).toEqual(sheetPagePayload);
      });

      it('should clear activeSheetPage when payload is null', () => {
        const initialSheetPageState = {
          ...initialState,
          activeSheetPage: {
            route: SheetRoutes.RecoveryPhrase,
            params: { walletId: 'wallet-old' },
          },
        };

        const state = viewsReducers.views(
          initialSheetPageState,
          actions.views.setActiveSheetPage(null),
        );

        expect(state.activeSheetPage).toBe(null);
      });

      it('should set activeSheetPage with only route', () => {
        const sheetPagePayload = {
          route: SheetRoutes.Initial,
        };

        const state = viewsReducers.views(
          initialState,
          actions.views.setActiveSheetPage(sheetPagePayload),
        );

        expect(state.activeSheetPage).toEqual(sheetPagePayload);
      });

      it('should update activeSheetPage from null to a new page', () => {
        const sheetPagePayload = {
          route: SheetRoutes.AddAccount,
          params: { walletId: 'wallet-123' },
        };

        const state = viewsReducers.views(
          initialState,
          actions.views.setActiveSheetPage(sheetPagePayload),
        );

        expect(state.activeSheetPage).toEqual(sheetPagePayload);
      });

      it('should update activeSheetPage from one page to another', () => {
        const initialSheetPageState = {
          ...initialState,
          activeSheetPage: {
            route: SheetRoutes.RecoveryPhrase,
            params: { walletId: 'wallet-old' },
          },
        };

        const newSheetPagePayload = {
          route: SheetRoutes.AccountKey,
          params: { walletId: 'wallet-new', accountId: 'account-new' },
        };

        const state = viewsReducers.views(
          initialSheetPageState,
          actions.views.setActiveSheetPage(newSheetPagePayload),
        );

        expect(state.activeSheetPage).toEqual(newSheetPagePayload);
      });
    });

    describe('selectors', () => {
      const viewsInState = {
        view1: {
          id: ViewId('view1'),
          type: 'sidePanel' as const,
          location: '/location1',
        },
        view2: {
          id: ViewId('view2'),
          type: 'sidePanel' as const,
          location: '/location2',
        },
      };

      const state: ViewsStoreState = {
        views: {
          open: viewsInState,
          colorScheme: 'light',
          activeSheet: null,
          activePage: null,
          activeSheetPage: null,
          language: 'en',
          hasExplicitLanguagePreference: false,
        },
      };

      describe('selectOpenViews', () => {
        it('should return all open views as an array of view objects', () => {
          const result = selectors.views.selectOpenViews(state);

          expect(result).toEqual(Object.values(viewsInState));
        });
      });

      describe('selectOpenViewsMap', () => {
        it('should return all open views as a map of view objects', () => {
          const result = selectors.views.selectOpenViewsMap(state);

          expect(result).toEqual(viewsInState);
        });
      });

      it('selectColorScheme', () => {
        expect(selectors.views.selectColorScheme(state)).toBe(
          state.views.colorScheme,
        );
      });

      describe('getActiveSheet', () => {
        it('should return null when no active sheet is set', () => {
          const result = selectors.views.getActiveSheet(state);
          expect(result).toBe(null);
        });

        it('should return null when active sheet is explicitly set to null', () => {
          const stateWithNullSheet: ViewsStoreState = {
            views: {
              open: viewsInState,
              colorScheme: 'light',
              activeSheet: null,
              activePage: null,
              activeSheetPage: null,
              language: 'en',
              hasExplicitLanguagePreference: false,
            },
          };

          const result = selectors.views.getActiveSheet(stateWithNullSheet);
          expect(result).toBe(null);
        });
      });

      describe('getActivePage', () => {
        it('should return null when no active page is set', () => {
          const result = selectors.views.getActivePage(state);
          expect(result).toBe(null);
        });

        it('should return the active page when set', () => {
          const activePage = {
            route: StackRoutes.AccountDetails,
            params: { walletId: 'wallet-123', accountId: 'account-456' },
          };

          const stateWithActivePage: ViewsStoreState = {
            views: {
              open: viewsInState,
              colorScheme: 'light',
              activeSheet: null,
              activePage,
              activeSheetPage: null,
              language: 'en',
              hasExplicitLanguagePreference: false,
            },
          };

          const result = selectors.views.getActivePage(stateWithActivePage);
          expect(result).toEqual(activePage);
        });

        it('should return the active page with only route when params are not provided', () => {
          const activePage = {
            route: StackRoutes.Collateral,
          };

          const stateWithActivePage: ViewsStoreState = {
            views: {
              open: viewsInState,
              colorScheme: 'light',
              activeSheet: null,
              activePage,
              activeSheetPage: null,
              language: 'en',
              hasExplicitLanguagePreference: false,
            },
          };

          const result = selectors.views.getActivePage(stateWithActivePage);
          expect(result).toEqual(activePage);
        });

        it('should return null when active page is explicitly set to null', () => {
          const stateWithNullPage: ViewsStoreState = {
            views: {
              open: viewsInState,
              colorScheme: 'light',
              activeSheet: null,
              activePage: null,
              activeSheetPage: null,
              language: 'en',
              hasExplicitLanguagePreference: false,
            },
          };

          const result = selectors.views.getActivePage(stateWithNullPage);
          expect(result).toBe(null);
        });
      });

      describe('getActiveSheetPage', () => {
        it('should return null when no active sheet page is set', () => {
          const result = selectors.views.getActiveSheetPage(state);
          expect(result).toBe(null);
        });

        it('should return the active sheet page when set', () => {
          const activeSheetPage = {
            route: SheetRoutes.ActivityDetail,
            params: { activityId: 'activity-123' },
          };

          const stateWithActiveSheetPage: ViewsStoreState = {
            views: {
              open: viewsInState,
              colorScheme: 'light',
              activeSheet: null,
              activePage: null,
              activeSheetPage,
              language: 'en',
              hasExplicitLanguagePreference: false,
            },
          };

          const result = selectors.views.getActiveSheetPage(
            stateWithActiveSheetPage,
          );
          expect(result).toEqual(activeSheetPage);
        });

        it('should return the active sheet page with only route when params are not provided', () => {
          const activeSheetPage = {
            route: SheetRoutes.Buy,
          };

          const stateWithActiveSheetPage: ViewsStoreState = {
            views: {
              open: viewsInState,
              colorScheme: 'light',
              activeSheet: null,
              activePage: null,
              activeSheetPage,
              language: 'en',
              hasExplicitLanguagePreference: false,
            },
          };

          const result = selectors.views.getActiveSheetPage(
            stateWithActiveSheetPage,
          );
          expect(result).toEqual(activeSheetPage);
        });

        it('should return null when active sheet page is explicitly set to null', () => {
          const stateWithNullSheetPage: ViewsStoreState = {
            views: {
              open: viewsInState,
              colorScheme: 'light',
              activeSheet: null,
              activePage: null,
              activeSheetPage: null,
              language: 'en',
              hasExplicitLanguagePreference: false,
            },
          };

          const result = selectors.views.getActiveSheetPage(
            stateWithNullSheetPage,
          );
          expect(result).toBe(null);
        });
      });
    });
  });
});
