import { IViewsList } from '../../../types';
import { ConfirmTransaction } from '../components/confirm-transaction/ConfirmTransaction';
import { SignTransaction } from '../components/SignTransaction';
import { DappTransactionFail } from '../components/DappTransactionFail';
import { IViewAction, IViewState } from '../../../providers';
import { DappConfirmData as ConfirmData } from '../components/ConfirmData';
import { SignData } from '../components/SignData';
export enum DAPP_VIEWS {
  CONNECT = 'connect',
  CONFIRM_TX = 'confirm-tx',
  TX_SIGN = 'tx-sign',
  TX_SIGN_SUCCESS = 'tx-sign-success',
  TX_SIGN_FAILURE = 'tx-sign-failure',
  CONFIRM_DATA = 'confirm-data',
  SIGN_DATA = 'sign-data'
}

export const sendViewList: IViewsList<DAPP_VIEWS> = {
  [DAPP_VIEWS.CONFIRM_TX]: ConfirmTransaction,
  [DAPP_VIEWS.TX_SIGN]: SignTransaction,
  [DAPP_VIEWS.TX_SIGN_FAILURE]: DappTransactionFail
};

export const getSendViewComponent: IViewAction<DAPP_VIEWS> = (currentView: DAPP_VIEWS) => sendViewList[currentView];

export const sendViewsFlowState: IViewState<DAPP_VIEWS> = {
  initial: DAPP_VIEWS.CONFIRM_TX,
  states: {
    [DAPP_VIEWS.CONFIRM_TX]: {
      prev: DAPP_VIEWS.CONFIRM_TX,
      next: DAPP_VIEWS.TX_SIGN,
      action: getSendViewComponent
    },
    [DAPP_VIEWS.TX_SIGN]: {
      next: DAPP_VIEWS.CONFIRM_TX,
      prev: DAPP_VIEWS.CONFIRM_TX,
      action: getSendViewComponent
    },
    [DAPP_VIEWS.TX_SIGN_FAILURE]: {
      next: DAPP_VIEWS.TX_SIGN_FAILURE,
      prev: DAPP_VIEWS.CONFIRM_TX,
      action: getSendViewComponent
    }
  }
};

export const signDataViewList: IViewsList<DAPP_VIEWS> = {
  [DAPP_VIEWS.CONFIRM_DATA]: ConfirmData,
  [DAPP_VIEWS.SIGN_DATA]: SignData,
  [DAPP_VIEWS.TX_SIGN_FAILURE]: DappTransactionFail
};

export const getSignDataViewComponent: IViewAction<DAPP_VIEWS> = (currentView: DAPP_VIEWS) =>
  signDataViewList[currentView];

export const signDataViewsFlowState: IViewState<DAPP_VIEWS> = {
  initial: DAPP_VIEWS.CONFIRM_DATA,
  states: {
    [DAPP_VIEWS.CONFIRM_DATA]: {
      prev: DAPP_VIEWS.CONFIRM_DATA,
      next: DAPP_VIEWS.SIGN_DATA,
      action: getSignDataViewComponent
    },
    [DAPP_VIEWS.SIGN_DATA]: {
      next: DAPP_VIEWS.CONFIRM_DATA,
      prev: DAPP_VIEWS.CONFIRM_DATA,
      action: getSignDataViewComponent
    },
    [DAPP_VIEWS.TX_SIGN_FAILURE]: {
      next: DAPP_VIEWS.TX_SIGN_FAILURE,
      prev: DAPP_VIEWS.CONFIRM_DATA,
      action: getSignDataViewComponent
    }
  }
};

export const sectionTitle: Record<string, string> = {
  [DAPP_VIEWS.CONNECT]: 'dapp.connect.header',
  [DAPP_VIEWS.CONFIRM_TX]: 'dapp.confirm.header',
  [DAPP_VIEWS.TX_SIGN]: 'dapp.sign.header',
  [DAPP_VIEWS.TX_SIGN_SUCCESS]: 'dapp.sign.success.header',
  [DAPP_VIEWS.TX_SIGN_FAILURE]: 'dapp.sign.failure.header',
  [DAPP_VIEWS.CONFIRM_DATA]: 'dapp.confirm.header.confirmData',
  [DAPP_VIEWS.SIGN_DATA]: 'dapp.confirm.header.signData'
};
