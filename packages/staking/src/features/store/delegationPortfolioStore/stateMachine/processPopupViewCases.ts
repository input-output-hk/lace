import { atomicStateMutators } from './atomicStateMutators';
import {
  CancelDrawer,
  PopupCurrentPoolDetailsCommand,
  PopupOverviewCommand,
  ShowDelegatedPoolDetails,
} from './commands';
import { cases, handler } from './stateTreeUtilities';
import { DelegationFlow, Handler, PopupViewDelegationFlow, StateCurrentPoolDetails, StateOverview } from './types';

export const processPopupViewCases: Handler = (params) =>
  cases<PopupViewDelegationFlow>(
    {
      [DelegationFlow.Overview]: cases<PopupOverviewCommand['type']>(
        {
          ShowDelegatedPoolDetails: handler<ShowDelegatedPoolDetails, StateOverview, StateCurrentPoolDetails>(
            ({ command: { data }, state }) => ({
              ...state,
              ...atomicStateMutators.showPoolDetails({ pool: data, targetFlow: DelegationFlow.CurrentPoolDetails }),
            })
          ),
        },
        params.command.type,
        DelegationFlow.Overview
      ),
      [DelegationFlow.CurrentPoolDetails]: cases<PopupCurrentPoolDetailsCommand['type']>(
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
    },
    params.state.activeDelegationFlow as PopupViewDelegationFlow,
    'root'
  )(params);
