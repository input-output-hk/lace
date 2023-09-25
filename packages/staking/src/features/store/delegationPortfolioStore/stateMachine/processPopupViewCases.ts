import { atomicStateMutators } from './atomicStateMutators';
import { PopupCurrentPoolDetailsCommand, PopupOverviewCommand, ShowDelegatedPoolDetails } from './commands';
import { cases, handler } from './stateTreeUtilities';
import { Flow, Handler, PopupViewFLow } from './types';

export const processPopupViewCases: Handler = (params) =>
  cases<PopupViewFLow>(
    {
      [Flow.Overview]: cases<PopupOverviewCommand['type']>(
        {
          ShowDelegatedPoolDetails: handler<ShowDelegatedPoolDetails>(({ state, command: { data } }) => {
            atomicStateMutators.showPoolDetails({ pool: data, state, targetFlow: Flow.CurrentPoolDetails });
          }),
        },
        params.command.type,
        Flow.Overview
      ),
      [Flow.CurrentPoolDetails]: cases<PopupCurrentPoolDetailsCommand['type']>(
        {
          CancelDrawer: ({ state }) => {
            atomicStateMutators.cancelDrawer({ state, targetFlow: Flow.Overview });
            state.viewedStakePool = undefined;
          },
        },
        params.command.type,
        Flow.CurrentPoolDetails
      ),
    },
    params.state.activeFlow as PopupViewFLow,
    'root'
  )(params);
