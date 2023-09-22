import { atomicStateMutators } from './atomicStateMutators';
import {
  BrowsePoolsCommand,
  ChangingPreferencesCommand,
  CurrentPoolDetailsCommand,
  NewPortfolioConfirmationCommand,
  NewPortfolioFailureCommand,
  NewPortfolioPreferencesCommand,
  NewPortfolioSignCommand,
  NewPortfolioSuccessCommand,
  OverviewCommand,
  PoolDetailsCommand,
  PortfolioManagementConfirmationCommand,
  PortfolioManagementFailureCommand,
  PortfolioManagementPreferencesCommand,
  PortfolioManagementSignCommand,
  PortfolioManagementSuccessCommand,
  RemoveStakePool,
  SelectPoolFromDetails,
  SelectPoolFromList,
  ShowDelegatedPoolDetails,
  ShowPoolDetailsFromList,
  UnselectPoolFromDetails,
  UnselectPoolFromList,
} from './commands';
import { mapStakePoolToPortfolioPool } from './mapStakePoolToPortfolioPool';
import { cases, handler } from './stateTreeUtilities';
import { DrawerManagementStep, ExpandedViewFlow, Flow, Handler } from './types';

export const processExpandedViewCases: Handler = (params) =>
  cases<ExpandedViewFlow>(
    {
      [Flow.Overview]: cases<OverviewCommand['type']>(
        {
          GoToBrowsePools: ({ state }) => {
            state.activeFlow = Flow.BrowsePools;
          },
          ManagePortfolio: ({ state }) => {
            state.activeFlow = Flow.PortfolioManagement;
            state.activeDrawerStep = DrawerManagementStep.Preferences;
            state.draftPortfolio = state.currentPortfolio;
          },
          ShowDelegatedPoolDetails: handler<ShowDelegatedPoolDetails>(({ state, command: { data } }) => {
            atomicStateMutators.showPoolDetails({ pool: data, state, targetFlow: Flow.CurrentPoolDetails });
          }),
        },
        params.command.type as OverviewCommand['type'],
        Flow.Overview
      ),
      [Flow.BrowsePools]: cases<BrowsePoolsCommand['type']>(
        {
          ClearSelections: ({ state }) => {
            state.selectedPortfolio = [];
          },
          CreateNewPortfolio: ({ state }) => {
            if (state.currentPortfolio.length > 0) {
              atomicStateMutators.showChangingPreferencesConfirmation({
                pendingSelectedPortfolio: state.selectedPortfolio,
                state,
              });
            } else {
              atomicStateMutators.beginNewPortfolioCreation({ selections: state.selectedPortfolio, state });
            }
          },
          GoToOverview: ({ state }) => {
            state.activeFlow = Flow.Overview;
          },
          SelectPoolFromList: handler<SelectPoolFromList>(({ state, command: { data } }) => {
            atomicStateMutators.selectPool({
              stakePool: data,
              state,
            });
          }),
          ShowPoolDetailsFromList: handler<ShowPoolDetailsFromList>(({ state, command: { data } }) => {
            atomicStateMutators.showPoolDetails({ pool: data, state, targetFlow: Flow.PoolDetails });
          }),
          UnselectPoolFromList: handler<UnselectPoolFromList>(({ state, command: { data } }) => {
            atomicStateMutators.unselectPool({ id: data, state });
          }),
        },
        params.command.type as BrowsePoolsCommand['type'],
        Flow.BrowsePools
      ),
      [Flow.CurrentPoolDetails]: cases<CurrentPoolDetailsCommand['type']>(
        {
          CancelDrawer: ({ state }) => {
            atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.Overview });
            state.viewedStakePool = undefined;
          },
        },
        params.command.type as CurrentPoolDetailsCommand['type'],
        Flow.CurrentPoolDetails
      ),
      [Flow.PoolDetails]: cases<PoolDetailsCommand['type']>(
        {
          BeginSingleStaking: ({ state }) => {
            if (!state.viewedStakePool) return;
            const portfolioPool = mapStakePoolToPortfolioPool({
              cardanoCoinSymbol: state.cardanoCoinSymbol,
              stakePool: state.viewedStakePool,
            });

            if (state.currentPortfolio.length > 0) {
              atomicStateMutators.showChangingPreferencesConfirmation({
                pendingSelectedPortfolio: [portfolioPool],
                state,
              });
            } else {
              atomicStateMutators.beginNewPortfolioCreation({ selections: [portfolioPool], state });
            }
          },
          CancelDrawer: ({ state }) => {
            atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.BrowsePools });
            state.viewedStakePool = undefined;
          },
          SelectPoolFromDetails: handler<SelectPoolFromDetails>(({ /* executeCommand,*/ state, command: { data } }) => {
            atomicStateMutators.selectPool({ stakePool: data, state });
            // ALT SOLUTION TBD:
            // executeCommand({ type: 'CancelDrawer' }})
            atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.BrowsePools });
            state.viewedStakePool = undefined;
          }),
          UnselectPoolFromDetails: handler<UnselectPoolFromDetails>(
            ({ /* executeCommand,*/ state, command: { data } }) => {
              atomicStateMutators.unselectPool({ id: data, state });
              // ALT SOLUTION TBD:
              // executeCommand({ type: 'CancelDrawer' }})
              atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.BrowsePools });
              state.viewedStakePool = undefined;
            }
          ),
        },
        params.command.type as PoolDetailsCommand['type'],
        Flow.PoolDetails
      ),
      [Flow.PortfolioManagement]: cases<DrawerManagementStep>(
        {
          [DrawerManagementStep.Preferences]: cases<PortfolioManagementPreferencesCommand['type']>(
            {
              AddStakePools: ({ state }) => {
                atomicStateMutators.addPoolsFromPreferences({ state });
              },
              CancelDrawer: ({ state }) => {
                atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.Overview });
                state.draftPortfolio = undefined;
              },
              DrawerContinue: ({ state }) => {
                state.activeDrawerStep = DrawerManagementStep.Confirmation;
              },
              RemoveStakePool: handler<RemoveStakePool>(({ state, command: { data } }) => {
                atomicStateMutators.removePoolFromPreferences({ id: data, state });
              }),
            },
            params.command.type as PortfolioManagementPreferencesCommand['type'],
            DrawerManagementStep.Preferences
          ),
          [DrawerManagementStep.Confirmation]: cases<PortfolioManagementConfirmationCommand['type']>(
            {
              CancelDrawer: ({ state }) => {
                atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.Overview });
                state.draftPortfolio = undefined;
              },
              DrawerBack: ({ state }) => {
                state.activeDrawerStep = DrawerManagementStep.Preferences;
              },
              DrawerContinue: ({ state }) => {
                state.activeDrawerStep = DrawerManagementStep.Sign;
              },
            },
            params.command.type as PortfolioManagementConfirmationCommand['type'],
            DrawerManagementStep.Confirmation
          ),
          [DrawerManagementStep.Sign]: cases<PortfolioManagementSignCommand['type']>(
            {
              CancelDrawer: ({ state }) => {
                atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.Overview });
                state.draftPortfolio = undefined;
              },
              DrawerBack: ({ state }) => {
                state.activeDrawerStep = DrawerManagementStep.Confirmation;
              },
              DrawerContinue: ({ state }) => {
                state.activeDrawerStep = DrawerManagementStep.Success;
              },
              DrawerFailure: ({ state }) => {
                state.activeDrawerStep = DrawerManagementStep.Failure;
              },
            },
            params.command.type as PortfolioManagementSignCommand['type'],
            DrawerManagementStep.Sign
          ),
          [DrawerManagementStep.Success]: cases<PortfolioManagementSuccessCommand['type']>(
            {
              CancelDrawer: ({ state }) => {
                atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.Overview });
                state.draftPortfolio = undefined;
              },
            },
            params.command.type as PortfolioManagementSuccessCommand['type'],
            DrawerManagementStep.Success
          ),
          [DrawerManagementStep.Failure]: cases<PortfolioManagementFailureCommand['type']>(
            {
              CancelDrawer: ({ state }) => {
                atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.Overview });
                state.draftPortfolio = undefined;
              },
              DrawerBack: ({ state }) => {
                state.activeDrawerStep = DrawerManagementStep.Sign;
              },
              DrawerContinue: ({ state }) => {
                state.activeDrawerStep = DrawerManagementStep.Success;
              },
            },
            params.command.type as PortfolioManagementFailureCommand['type'],
            DrawerManagementStep.Failure
          ),
        },
        params.state.activeDrawerStep as DrawerManagementStep,
        Flow.PortfolioManagement
      ),
      // TODO: reconsider this approach. Maybe it would be better to have just a boolean state for opening the modal
      //  instead of having a separate flow. It might feel more like a part of new portfolio creation step rather
      //  a separate flow.
      [Flow.ChangingPreferences]: cases<ChangingPreferencesCommand['type']>(
        {
          ConfirmChangingPreferences: ({ state }) => {
            if (!state.pendingSelectedPortfolio) return;
            atomicStateMutators.beginNewPortfolioCreation({ selections: state.pendingSelectedPortfolio, state });
            state.pendingSelectedPortfolio = undefined;
          },
          DiscardChangingPreferences: ({ state }) => {
            state.activeFlow = Flow.BrowsePools;
            state.pendingSelectedPortfolio = undefined;
          },
        },
        params.command.type as ChangingPreferencesCommand['type'],
        Flow.ChangingPreferences
      ),
      [Flow.NewPortfolio]: cases<DrawerManagementStep>(
        {
          [DrawerManagementStep.Preferences]: cases<NewPortfolioPreferencesCommand['type']>(
            {
              AddStakePools: ({ state }) => {
                atomicStateMutators.addPoolsFromPreferences({ state });
              },
              CancelDrawer: ({ state }) => {
                atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.BrowsePools });
                state.draftPortfolio = undefined;
              },
              DrawerContinue: ({ state }) => {
                state.activeDrawerStep = DrawerManagementStep.Confirmation;
              },
              RemoveStakePool: handler<RemoveStakePool>(({ state, command: { data } }) => {
                atomicStateMutators.removePoolFromPreferences({ id: data, state });
              }),
            },
            params.command.type as NewPortfolioPreferencesCommand['type'],
            DrawerManagementStep.Preferences
          ),
          [DrawerManagementStep.Confirmation]: cases<NewPortfolioConfirmationCommand['type']>(
            {
              CancelDrawer: ({ state }) => {
                atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.BrowsePools });
                state.draftPortfolio = undefined;
              },
              DrawerBack: ({ state }) => {
                state.activeDrawerStep = DrawerManagementStep.Preferences;
              },
              DrawerContinue: ({ state }) => {
                state.activeDrawerStep = DrawerManagementStep.Sign;
              },
            },
            params.command.type as NewPortfolioConfirmationCommand['type'],
            DrawerManagementStep.Confirmation
          ),
          [DrawerManagementStep.Sign]: cases<NewPortfolioSignCommand['type']>(
            {
              CancelDrawer: ({ state }) => {
                atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.BrowsePools });
                state.draftPortfolio = undefined;
              },
              DrawerBack: ({ state }) => {
                state.activeDrawerStep = DrawerManagementStep.Confirmation;
              },
              DrawerContinue: ({ state }) => {
                state.activeDrawerStep = DrawerManagementStep.Success;
              },
              DrawerFailure: ({ state }) => {
                state.activeDrawerStep = DrawerManagementStep.Failure;
              },
            },
            params.command.type as NewPortfolioSignCommand['type'],
            DrawerManagementStep.Sign
          ),
          [DrawerManagementStep.Success]: cases<NewPortfolioSuccessCommand['type']>(
            {
              CancelDrawer: ({ state }) => {
                atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.BrowsePools });
                state.draftPortfolio = undefined;
                state.selectedPortfolio = []; // NewPortfolio-specific
              },
            },
            params.command.type as NewPortfolioSuccessCommand['type'],
            DrawerManagementStep.Success
          ),
          [DrawerManagementStep.Failure]: cases<NewPortfolioFailureCommand['type']>(
            {
              CancelDrawer: ({ state }) => {
                atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.BrowsePools });
                state.draftPortfolio = undefined;
              },
              DrawerContinue: ({ state }) => {
                state.activeDrawerStep = DrawerManagementStep.Success;
              },
            },
            params.command.type as NewPortfolioFailureCommand['type'],
            DrawerManagementStep.Failure
          ),
        },
        params.state.activeDrawerStep as DrawerManagementStep,
        Flow.NewPortfolio
      ),
    },
    params.state.activeFlow,
    'root'
  )(params);
