import { DAPP_VIEWS } from '@src/features/dapp/config';
import React, { useState, createContext, useContext } from 'react';
import { SignDataRequest, TransactionWitnessRequest } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';

export type IViewAction<TArg> = (arg: TArg) => () => React.ReactElement;

export interface IViewState<T extends string> {
  initial: T;
  states: Partial<
    Record<
      T,
      {
        next: T;
        prev: T;
        action: IViewAction<T>;
      }
    >
  >;
}

const useViewsFlowState = (view: IViewState<DAPP_VIEWS>) => {
  const [currentView, setCurrentView] = useState(view.initial);
  const [dappInfo, setDappInfo] = useState<Wallet.DappInfo>();
  const [signTxRequest, setSignTxRequest] = useState<
    TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata> | undefined
  >();
  const [signDataRequest, setSignDataRequest] = useState<
    SignDataRequest<Wallet.WalletMetadata, Wallet.AccountMetadata> | undefined
  >();

  const renderCurrentView = (): (() => React.ReactElement) => view.states[currentView].action(currentView);

  const setPreviousView = () => {
    const previousView = view.states[currentView].prev;
    setCurrentView(previousView);
  };

  const setNextView = () => {
    const nextView = view.states[currentView].next;
    setCurrentView(nextView);
  };
  return {
    currentView,
    utils: { renderCurrentView, setPreviousView, setNextView },
    dappInfo,
    setDappInfo,
    signTxRequest: {
      set: setSignTxRequest,
      request: signTxRequest
    },
    signDataRequest: {
      set: setSignDataRequest,
      request: signDataRequest
    }
  };
};

// eslint-disable-next-line unicorn/no-null
const ViewsFlowContext = createContext<ReturnType<typeof useViewsFlowState | null>>(null);

export const useViewsFlowContext = (): ReturnType<typeof useViewsFlowState> => {
  const viewFlowContext = useContext(ViewsFlowContext);
  if (viewFlowContext === null) throw new Error('ViewsFlowContext not defined');
  return viewFlowContext;
};

interface ViewFlowProviderProps {
  children: React.ReactNode;
  viewStates: IViewState<DAPP_VIEWS>;
}

export const ViewFlowProvider = ({ children, viewStates }: ViewFlowProviderProps): React.ReactElement => (
  <ViewsFlowContext.Provider value={useViewsFlowState(viewStates)}>{children}</ViewsFlowContext.Provider>
);
