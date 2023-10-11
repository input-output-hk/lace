import { atomicStateMutators } from './atomicStateMutators';
import {
  CancelDrawer,
  PopupCurrentPoolDetailsCommand,
  PopupOverviewCommand,
  ShowDelegatedPoolDetails,
} from './commands';
import { cases, handler } from './stateTreeUtilities';
import { Flow, Handler, PopupViewFLow, StateCurrentPoolDetails, StateOverview } from './types';

export const processPopupViewCases: Handler = (params) =>
  cases<PopupViewFLow>(
    {
      [Flow.Overview]: cases<PopupOverviewCommand['type']>(
        {
          ShowDelegatedPoolDetails: handler<ShowDelegatedPoolDetails, StateOverview, StateCurrentPoolDetails>(
            ({ command: { data }, state }) => ({
              ...state,
              ...atomicStateMutators.showPoolDetails({ pool: data, targetFlow: Flow.CurrentPoolDetails }),
            })
          ),
        },
        params.command.type,
        Flow.Overview
      ),
      [Flow.CurrentPoolDetails]: cases<PopupCurrentPoolDetailsCommand['type']>(
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
    },
    params.state.activeFlow as PopupViewFLow,
    'root'
  )(params);
