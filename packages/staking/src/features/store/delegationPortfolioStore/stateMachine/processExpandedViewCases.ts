import { PERCENTAGE_SCALE_MAX } from '../constants';
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
import { initializeDraftPortfolioPool } from './initializeDraftPortfolioPool';
import { cases, handler } from './stateTreeUtilities';
import {
  CurrentPortfolioStakePool,
  DelegationFlow,
  DraftPortfolioStakePool,
  DrawerManagementStep,
  ExpandedViewDelegationFlow,
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
  pools.map((cp) => ({
    ...cp,
    sliderIntegerPercentage: cp.savedIntegerPercentage,
  }));

export const processExpandedViewCases: Handler = (params) =>
  cases<ExpandedViewDelegationFlow>(
    {
      [DelegationFlow.Overview]: cases<OverviewCommand['type']>(
        {
          GoToBrowsePools: handler<GoToBrowsePools, StateOverview, StateBrowsePools>(({ state }) => ({
            ...state,
            activeDelegationFlow: DelegationFlow.BrowsePools,
          })),
          ManagePortfolio: handler<ManagePortfolio, StateOverview, StatePortfolioManagement>(({ state }) => ({
            ...state,
            activeDelegationFlow: DelegationFlow.PortfolioManagement,
            activeDrawerStep: DrawerManagementStep.Preferences,
            draftPortfolio: currentPortfolioToDraft(state.currentPortfolio),
          })),
          ShowDelegatedPoolDetails: handler<ShowDelegatedPoolDetails, StateOverview, StateCurrentPoolDetails>(
            ({ state, command: { data } }) => ({
              ...state,
              ...atomicStateMutators.showPoolDetails({ pool: data, targetFlow: DelegationFlow.CurrentPoolDetails }),
            })
          ),
        },
        params.command.type,
        DelegationFlow.Overview
      ),
      [DelegationFlow.BrowsePools]: cases<BrowsePoolsCommand['type']>(
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
            activeDelegationFlow: DelegationFlow.Overview,
            activeDrawerStep: undefined,
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
              ...atomicStateMutators.showPoolDetails({ pool: data, targetFlow: DelegationFlow.PoolDetails }),
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
        DelegationFlow.BrowsePools
      ),
      [DelegationFlow.CurrentPoolDetails]: cases<CurrentPoolDetailsCommand['type']>(
        {
          CancelDrawer: handler<CancelDrawer, StateCurrentPoolDetails, StateOverview>(({ state }) => ({
            ...state,
            ...atomicStateMutators.cancelDrawer({ state, targetFlow: DelegationFlow.Overview }),
            viewedStakePool: undefined,
          })),
        },
        params.command.type,
        DelegationFlow.CurrentPoolDetails
      ),
      [DelegationFlow.PoolDetails]: cases<PoolDetailsCommand['type']>(
        {
          BeginSingleStaking: handler<
            BeginSingleStaking,
            StatePoolDetails,
            StatePoolDetails | StateChangingPreferences | StateNewPortfolio
          >(({ state }) => {
            if (!state.viewedStakePool) return state;
            const portfolioPool = initializeDraftPortfolioPool({
              // initialize the slider to MAX for single-pool staking
              initialPercentage: PERCENTAGE_SCALE_MAX,
              stakePool: state.viewedStakePool,
              state,
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
            ...atomicStateMutators.cancelDrawer({ state, targetFlow: DelegationFlow.BrowsePools }),
            viewedStakePool: undefined,
          })),
          SelectPoolFromDetails: handler<SelectPoolFromDetails, StatePoolDetails, StateBrowsePools>(
            ({ state, command: { data } }) => ({
              ...state,
              ...atomicStateMutators.selectPool({ stakePool: data, state }),
              ...atomicStateMutators.cancelDrawer({ state, targetFlow: DelegationFlow.BrowsePools }),
              viewedStakePool: undefined,
            })
          ),
          UnselectPoolFromDetails: handler<UnselectPoolFromDetails, StatePoolDetails, StateBrowsePools>(
            ({ state, command: { data } }) => ({
              ...state,
              ...atomicStateMutators.unselectPool({ id: data, state }),
              ...atomicStateMutators.cancelDrawer({ state, targetFlow: DelegationFlow.BrowsePools }),
              viewedStakePool: undefined,
            })
          ),
        },
        params.command.type,
        DelegationFlow.PoolDetails
      ),
      [DelegationFlow.PortfolioManagement]: cases<DrawerManagementStep>(
        {
          [DrawerManagementStep.Preferences]: cases<PortfolioManagementPreferencesCommand['type']>(
            {
              AddStakePools: handler<AddStakePools, StatePortfolioManagement, StateBrowsePools>(({ state }) => ({
                ...state,
                ...atomicStateMutators.addPoolsFromPreferences({ state }),
              })),
              CancelDrawer: handler<CancelDrawer, StatePortfolioManagement, StateOverview>(({ state }) => ({
                ...state,
                ...atomicStateMutators.cancelDrawer({ state, targetFlow: DelegationFlow.Overview }),
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
                ...atomicStateMutators.cancelDrawer({ state, targetFlow: DelegationFlow.Overview }),
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
                ...atomicStateMutators.cancelDrawer({ state, targetFlow: DelegationFlow.Overview }),
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
                ...atomicStateMutators.cancelDrawer({ state, targetFlow: DelegationFlow.Overview }),
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
                ...atomicStateMutators.cancelDrawer({ state, targetFlow: DelegationFlow.Overview }),
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
        DelegationFlow.PortfolioManagement
      ),
      // TODO: reconsider this approach. Maybe it would be better to have just a boolean state for opening the modal
      //  instead of having a separate flow. It might feel more like a part of new portfolio creation step rather
      //  a separate flow.
      [DelegationFlow.ChangingPreferences]: cases<ChangingPreferencesCommand['type']>(
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
              activeDelegationFlow: DelegationFlow.BrowsePools,
              pendingSelectedPortfolio: undefined,
            })
          ),
        },
        params.command.type,
        DelegationFlow.ChangingPreferences
      ),
      [DelegationFlow.NewPortfolio]: cases<DrawerManagementStep>(
        {
          [DrawerManagementStep.Preferences]: cases<NewPortfolioPreferencesCommand['type']>(
            {
              AddStakePools: handler<AddStakePools, StateNewPortfolio, StateBrowsePools>(({ state }) => ({
                ...state,
                ...atomicStateMutators.addPoolsFromPreferences({ state }),
              })),
              CancelDrawer: handler<CancelDrawer, StateNewPortfolio, StateBrowsePools>(({ state }) => ({
                ...state,
                ...atomicStateMutators.cancelDrawer({ state, targetFlow: DelegationFlow.BrowsePools }),
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
                ...atomicStateMutators.cancelDrawer({ state, targetFlow: DelegationFlow.BrowsePools }),
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
                ...atomicStateMutators.cancelDrawer({ state, targetFlow: DelegationFlow.BrowsePools }),
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
                ...atomicStateMutators.cancelDrawer({ state, targetFlow: DelegationFlow.BrowsePools }),
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
                ...atomicStateMutators.cancelDrawer({ state, targetFlow: DelegationFlow.BrowsePools }),
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
        DelegationFlow.NewPortfolio
      ),
    },
    params.state.activeDelegationFlow,
    'root'
  )(params);
