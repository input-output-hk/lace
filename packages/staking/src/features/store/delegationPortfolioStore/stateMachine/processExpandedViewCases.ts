import { PERCENTAGE_SCALE_MAX, TMP_HOTFIX_PORTFOLIO_STORE_NOT_PERSISTED } from '../constants';
import { atomicStateMutators } from './atomicStateMutators';
import {
  AddStakePools,
  BeginSingleStaking,
  BrowsePoolsCommand,
  CancelDrawer,
  ChangingPreferencesCommand,
  ClearSelections,
  ConfirmChangingPreferences,
  CreateNewPortfolio,
  CurrentPoolDetailsCommand,
  DiscardChangingPreferences,
  DrawerBack,
  DrawerContinue,
  DrawerFailure,
  GoToBrowsePools,
  GoToOverview,
  ManagePortfolio,
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
  UpdateStakePercentage,
} from './commands';
import { mapStakePoolToPortfolioPool } from './mapStakePoolToPortfolioPool';
import { normalizePercentages } from './normalizePercentages';
import { cases, handler } from './stateTreeUtilities';
import {
  CurrentPortfolioStakePool,
  DraftPortfolioStakePool,
  DrawerManagementStep,
  ExpandedViewFlow,
  Flow,
  Handler,
  StateBrowsePools,
  StateChangingPreferences,
  StateCurrentPoolDetails,
  StateNewPortfolio,
  StateOverview,
  StatePoolDetails,
  StatePortfolioManagement,
} from './types';

export const currentPortfolioToDraft = (pools: CurrentPortfolioStakePool[]): DraftPortfolioStakePool[] =>
  TMP_HOTFIX_PORTFOLIO_STORE_NOT_PERSISTED
    ? normalizePercentages(
        pools.map((cp) => ({
          ...cp,
          basedOnCurrentPortfolio: true,
          sliderIntegerPercentage: cp.onChainPercentage,
        })),
        'sliderIntegerPercentage'
      )
    : pools.map((cp) => ({
        ...cp,
        basedOnCurrentPortfolio: true,
        sliderIntegerPercentage: cp.savedIntegerPercentage,
      }));

export const processExpandedViewCases: Handler = (params) =>
  cases<ExpandedViewFlow>(
    {
      [Flow.Overview]: cases<OverviewCommand['type']>(
        {
          GoToBrowsePools: handler<GoToBrowsePools, StateOverview, StateBrowsePools>(({ state }) => ({
            ...state,
            activeFlow: Flow.BrowsePools,
          })),
          ManagePortfolio: handler<ManagePortfolio, StateOverview, StatePortfolioManagement>(({ state }) => ({
            ...state,
            activeDrawerStep: DrawerManagementStep.Preferences,
            activeFlow: Flow.PortfolioManagement,
            draftPortfolio: currentPortfolioToDraft(state.currentPortfolio),
          })),
          ShowDelegatedPoolDetails: handler<ShowDelegatedPoolDetails, StateOverview, StateCurrentPoolDetails>(
            ({ state, command: { data } }) => ({
              ...state,
              ...atomicStateMutators.showPoolDetails({ pool: data, targetFlow: Flow.CurrentPoolDetails }),
            })
          ),
        },
        params.command.type,
        Flow.Overview
      ),
      [Flow.BrowsePools]: cases<BrowsePoolsCommand['type']>(
        {
          ClearSelections: handler<ClearSelections, StateBrowsePools, StateBrowsePools>(({ state }) => ({
            ...state,
            selectedPortfolio: [],
          })),
          CreateNewPortfolio: handler<
            CreateNewPortfolio,
            StateBrowsePools,
            StateChangingPreferences | StateNewPortfolio
          >(({ state }) => {
            if (state.currentPortfolio.length > 0) {
              return {
                ...state,
                ...atomicStateMutators.showChangingPreferencesConfirmation({
                  pendingSelectedPortfolio: state.selectedPortfolio,
                }),
              };
            }
            return {
              ...state,
              ...atomicStateMutators.beginNewPortfolioCreation({ selections: state.selectedPortfolio }),
            };
          }),
          GoToOverview: handler<GoToOverview, StateBrowsePools, StateOverview>(({ state }) => ({
            ...state,
            activeDrawerStep: undefined,
            activeFlow: Flow.Overview,
          })),
          SelectPoolFromList: handler<SelectPoolFromList, StateBrowsePools, StateBrowsePools>(
            ({ state, command: { data } }) => ({
              ...state,
              ...atomicStateMutators.selectPool({
                stakePool: data,
                state,
              }),
            })
          ),
          ShowPoolDetailsFromList: handler<ShowPoolDetailsFromList, StateBrowsePools, StatePoolDetails>(
            ({ state, command: { data } }) => ({
              ...state,
              ...atomicStateMutators.showPoolDetails({ pool: data, targetFlow: Flow.PoolDetails }),
            })
          ),
          UnselectPoolFromList: handler<UnselectPoolFromList, StateBrowsePools, StateBrowsePools>(
            ({ state, command: { data } }) => ({
              ...state,
              ...atomicStateMutators.unselectPool({ id: data, state }),
            })
          ),
        },
        params.command.type,
        Flow.BrowsePools
      ),
      [Flow.CurrentPoolDetails]: cases<CurrentPoolDetailsCommand['type']>(
        {
          CancelDrawer: handler<CancelDrawer, StateCurrentPoolDetails, StateOverview>(({ state }) => ({
            ...state,
            ...atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.Overview }),
            viewedStakePool: undefined,
          })),
        },
        params.command.type,
        Flow.CurrentPoolDetails
      ),
      [Flow.PoolDetails]: cases<PoolDetailsCommand['type']>(
        {
          BeginSingleStaking: handler<
            BeginSingleStaking,
            StatePoolDetails,
            StatePoolDetails | StateChangingPreferences | StateNewPortfolio
          >(({ state }) => {
            if (!state.viewedStakePool) return state;

            const portfolioPool = mapStakePoolToPortfolioPool({
              cardanoCoinSymbol: state.cardanoCoinSymbol,
              sliderIntegerPercentage: PERCENTAGE_SCALE_MAX,
              stakePool: state.viewedStakePool,
            });

            if (state.currentPortfolio.length > 0) {
              return {
                ...state,
                ...atomicStateMutators.showChangingPreferencesConfirmation({
                  pendingSelectedPortfolio: [portfolioPool],
                }),
              };
            }

            return {
              ...state,
              ...atomicStateMutators.beginNewPortfolioCreation({ selections: [portfolioPool] }),
              viewedStakePool: undefined,
            };
          }),
          CancelDrawer: handler<CancelDrawer, StatePoolDetails, StateBrowsePools>(({ state }) => ({
            ...state,
            ...atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.BrowsePools }),
            viewedStakePool: undefined,
          })),
          SelectPoolFromDetails: handler<SelectPoolFromDetails, StatePoolDetails, StateBrowsePools>(
            ({ state, command: { data } }) => ({
              ...state,
              ...atomicStateMutators.selectPool({ stakePool: data, state }),
              ...atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.BrowsePools }),
              viewedStakePool: undefined,
            })
          ),
          UnselectPoolFromDetails: handler<UnselectPoolFromDetails, StatePoolDetails, StateBrowsePools>(
            ({ state, command: { data } }) => ({
              ...state,
              ...atomicStateMutators.unselectPool({ id: data, state }),
              ...atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.BrowsePools }),
              viewedStakePool: undefined,
            })
          ),
        },
        params.command.type,
        Flow.PoolDetails
      ),
      [Flow.PortfolioManagement]: cases<DrawerManagementStep>(
        {
          [DrawerManagementStep.Preferences]: cases<PortfolioManagementPreferencesCommand['type']>(
            {
              AddStakePools: handler<AddStakePools, StatePortfolioManagement, StateBrowsePools>(({ state }) => ({
                ...state,
                ...atomicStateMutators.addPoolsFromPreferences({ state }),
              })),
              CancelDrawer: handler<CancelDrawer, StatePortfolioManagement, StateOverview>(({ state }) => ({
                ...state,
                ...atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.Overview }),
                draftPortfolio: undefined,
              })),
              DrawerContinue: handler<DrawerContinue, StatePortfolioManagement, StatePortfolioManagement>(
                ({ state }) => ({
                  ...state,
                  activeDrawerStep: DrawerManagementStep.Confirmation,
                })
              ),
              RemoveStakePool: handler<RemoveStakePool, StatePortfolioManagement, StatePortfolioManagement>(
                ({ state, command: { data } }) => ({
                  ...state,
                  ...atomicStateMutators.removePoolFromPreferences({ id: data, state }),
                })
              ),
              UpdateStakePercentage: handler<UpdateStakePercentage, StatePortfolioManagement, StatePortfolioManagement>(
                ({ state, command: { data } }) => ({
                  ...state,
                  ...atomicStateMutators.updateStakePercentage({
                    ...data,
                    state,
                  }),
                })
              ),
            },
            params.command.type,
            DrawerManagementStep.Preferences
          ),
          [DrawerManagementStep.Confirmation]: cases<PortfolioManagementConfirmationCommand['type']>(
            {
              // eslint-disable-next-line sonarjs/no-identical-functions
              CancelDrawer: handler<CancelDrawer, StatePortfolioManagement, StateOverview>(({ state }) => ({
                ...state,
                ...atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.Overview }),
                draftPortfolio: undefined,
              })),
              DrawerBack: handler<DrawerBack, StatePortfolioManagement, StatePortfolioManagement>(({ state }) => ({
                ...state,
                activeDrawerStep: DrawerManagementStep.Preferences,
              })),
              DrawerContinue: handler<DrawerContinue, StatePortfolioManagement, StatePortfolioManagement>(
                ({ state }) => ({
                  ...state,
                  activeDrawerStep: DrawerManagementStep.Sign,
                })
              ),
            },
            params.command.type,
            DrawerManagementStep.Confirmation
          ),
          [DrawerManagementStep.Sign]: cases<PortfolioManagementSignCommand['type']>(
            {
              // eslint-disable-next-line sonarjs/no-identical-functions
              CancelDrawer: handler<CancelDrawer, StatePortfolioManagement, StateOverview>(({ state }) => ({
                ...state,
                ...atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.Overview }),
                draftPortfolio: undefined,
              })),
              DrawerBack: handler<DrawerBack, StatePortfolioManagement, StatePortfolioManagement>(({ state }) => ({
                ...state,
                activeDrawerStep: DrawerManagementStep.Confirmation,
              })),
              DrawerContinue: handler<DrawerContinue, StatePortfolioManagement, StatePortfolioManagement>(
                ({ state }) => ({
                  ...state,
                  activeDrawerStep: DrawerManagementStep.Success,
                })
              ),
              DrawerFailure: handler<DrawerFailure, StatePortfolioManagement, StatePortfolioManagement>(
                ({ state }) => ({
                  ...state,
                  activeDrawerStep: DrawerManagementStep.Failure,
                })
              ),
            },
            params.command.type,
            DrawerManagementStep.Sign
          ),
          [DrawerManagementStep.Success]: cases<PortfolioManagementSuccessCommand['type']>(
            {
              // eslint-disable-next-line sonarjs/no-identical-functions
              CancelDrawer: handler<CancelDrawer, StatePortfolioManagement, StateOverview>(({ state }) => ({
                ...state,
                ...atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.Overview }),
                draftPortfolio: undefined,
              })),
            },
            params.command.type,
            DrawerManagementStep.Success
          ),
          [DrawerManagementStep.Failure]: cases<PortfolioManagementFailureCommand['type']>(
            {
              // eslint-disable-next-line sonarjs/no-identical-functions
              CancelDrawer: handler<CancelDrawer, StatePortfolioManagement, StateOverview>(({ state }) => ({
                ...state,
                ...atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.Overview }),
                draftPortfolio: undefined,
              })),
              DrawerBack: handler<DrawerBack, StatePortfolioManagement, StatePortfolioManagement>(({ state }) => ({
                ...state,
                activeDrawerStep: DrawerManagementStep.Sign,
              })),
              DrawerContinue: handler<DrawerContinue, StatePortfolioManagement, StatePortfolioManagement>(
                ({ state }) => ({
                  ...state,
                  activeDrawerStep: DrawerManagementStep.Success,
                })
              ),
            },
            params.command.type,
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
          ConfirmChangingPreferences: handler<
            ConfirmChangingPreferences,
            StateChangingPreferences,
            StateNewPortfolio | StateChangingPreferences
          >(({ state }) => {
            if (!state.pendingSelectedPortfolio) return state;
            return {
              ...state,
              ...atomicStateMutators.beginNewPortfolioCreation({ selections: state.pendingSelectedPortfolio }),
              pendingSelectedPortfolio: undefined,
            };
          }),
          DiscardChangingPreferences: handler<DiscardChangingPreferences, StateChangingPreferences, StateBrowsePools>(
            ({ state }) => ({
              ...state,
              activeFlow: Flow.BrowsePools,
              pendingSelectedPortfolio: undefined,
            })
          ),
        },
        params.command.type,
        Flow.ChangingPreferences
      ),
      [Flow.NewPortfolio]: cases<DrawerManagementStep>(
        {
          [DrawerManagementStep.Preferences]: cases<NewPortfolioPreferencesCommand['type']>(
            {
              AddStakePools: handler<AddStakePools, StateNewPortfolio, StateBrowsePools>(({ state }) => ({
                ...state,
                ...atomicStateMutators.addPoolsFromPreferences({ state }),
              })),
              CancelDrawer: handler<CancelDrawer, StateNewPortfolio, StateBrowsePools>(({ state }) => ({
                ...state,
                ...atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.BrowsePools }),
                draftPortfolio: undefined,
              })),
              DrawerContinue: handler<DrawerContinue, StatePortfolioManagement, StatePortfolioManagement>(
                ({ state }) => ({
                  ...state,
                  activeDrawerStep: DrawerManagementStep.Confirmation,
                })
              ),
              RemoveStakePool: handler<RemoveStakePool, StateNewPortfolio, StateNewPortfolio>(
                ({ state, command: { data } }) => ({
                  ...state,
                  ...atomicStateMutators.removePoolFromPreferences({ id: data, state }),
                })
              ),
              UpdateStakePercentage: handler<UpdateStakePercentage, StateNewPortfolio, StateNewPortfolio>(
                // eslint-disable-next-line sonarjs/no-identical-functions
                ({ state, command: { data } }) => ({
                  ...state,
                  ...atomicStateMutators.updateStakePercentage({
                    ...data,
                    state,
                  }),
                })
              ),
            },
            params.command.type,
            DrawerManagementStep.Preferences
          ),
          [DrawerManagementStep.Confirmation]: cases<NewPortfolioConfirmationCommand['type']>(
            {
              // eslint-disable-next-line sonarjs/no-identical-functions
              CancelDrawer: handler<CancelDrawer, StateNewPortfolio, StateBrowsePools>(({ state }) => ({
                ...state,
                ...atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.BrowsePools }),
                draftPortfolio: undefined,
              })),
              DrawerBack: handler<DrawerBack, StateNewPortfolio, StateNewPortfolio>(({ state }) => ({
                ...state,
                activeDrawerStep: DrawerManagementStep.Preferences,
              })),
              DrawerContinue: handler<DrawerContinue, StatePortfolioManagement, StatePortfolioManagement>(
                ({ state }) => ({
                  ...state,
                  activeDrawerStep: DrawerManagementStep.Sign,
                })
              ),
            },
            params.command.type,
            DrawerManagementStep.Confirmation
          ),
          [DrawerManagementStep.Sign]: cases<NewPortfolioSignCommand['type']>(
            {
              // eslint-disable-next-line sonarjs/no-identical-functions
              CancelDrawer: handler<CancelDrawer, StateNewPortfolio, StateBrowsePools>(({ state }) => ({
                ...state,
                ...atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.BrowsePools }),
                draftPortfolio: undefined,
              })),
              DrawerBack: handler<DrawerBack, StateNewPortfolio, StateNewPortfolio>(({ state }) => ({
                ...state,
                activeDrawerStep: DrawerManagementStep.Confirmation,
              })),
              DrawerContinue: handler<DrawerContinue, StatePortfolioManagement, StatePortfolioManagement>(
                ({ state }) => ({
                  ...state,
                  activeDrawerStep: DrawerManagementStep.Success,
                })
              ),
              DrawerFailure: handler<DrawerContinue, StatePortfolioManagement, StatePortfolioManagement>(
                ({ state }) => ({
                  ...state,
                  activeDrawerStep: DrawerManagementStep.Failure,
                })
              ),
            },
            params.command.type,
            DrawerManagementStep.Sign
          ),
          [DrawerManagementStep.Success]: cases<NewPortfolioSuccessCommand['type']>(
            {
              CancelDrawer: handler<CancelDrawer, StateNewPortfolio, StateBrowsePools>(({ state }) => ({
                ...state,
                ...atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.BrowsePools }),
                draftPortfolio: undefined,
                selectedPortfolio: [],
              })),
            },
            params.command.type,
            DrawerManagementStep.Success
          ),
          [DrawerManagementStep.Failure]: cases<NewPortfolioFailureCommand['type']>(
            {
              // eslint-disable-next-line sonarjs/no-identical-functions
              CancelDrawer: handler<CancelDrawer, StateNewPortfolio, StateBrowsePools>(({ state }) => ({
                ...state,
                ...atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.BrowsePools }),
                draftPortfolio: undefined,
              })),
              DrawerBack: handler<DrawerBack, StateNewPortfolio, StateNewPortfolio>(({ state }) => ({
                ...state,
                activeDrawerStep: DrawerManagementStep.Sign,
              })),
              DrawerContinue: handler<DrawerContinue, StatePortfolioManagement, StatePortfolioManagement>(
                ({ state }) => ({
                  ...state,
                  activeDrawerStep: DrawerManagementStep.Success,
                })
              ),
            },
            params.command.type,
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
