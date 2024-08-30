/* eslint-disable react/no-multi-comp */
import * as React from 'react';

const enum EDrawerAction {
  OPEN = 'open',
  CLOSE = 'close'
}

export type TDrawerAction = 'open' | 'close';

interface IDrawerActionOptions {
  type?: TDrawerAction;
}

export interface Action<Data = any> {
  type: TDrawerAction;
  data?: Data;
  options?: IDrawerActionOptions;
}

type Dispatch<Data = any> = (action: Action<Data>) => void;

interface State<Data = any> {
  type?: TDrawerAction;
  open: boolean;
  data?: Data;
}

const INITIAL_STATE = {
  open: false
};

const DrawerStateContext = React.createContext<{ state: State; dispatch: Dispatch } | undefined>(undefined as any);

DrawerStateContext.displayName = 'DrawerStateContext';

const drawerReducer = (state: State, action: Action): any => {
  switch (action.type) {
    case 'open':
      return { type: action.type, open: true, data: action.data };
    case 'close':
      return { open: false, data: state.data };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
};

const DrawerProvider = React.memo(({ children }: { children: React.ReactElement[] | React.ReactElement }) => {
  const [state, dispatch] = React.useReducer(drawerReducer, INITIAL_STATE);
  const value = { state, dispatch };
  return <DrawerStateContext.Provider value={value}>{children}</DrawerStateContext.Provider>;
});
DrawerProvider.displayName = 'DrawerProvider';

const useDrawer = <Data extends Record<any, any>>(): {
  state: State<Data>;
  dispatch: Dispatch<Data>;
} => {
  const context = React.useContext(DrawerStateContext);
  if (context === undefined) {
    throw new Error('useDrawer must be used within a DrawerProvider');
  }
  return context;
};

export { DrawerProvider, useDrawer, EDrawerAction, drawerReducer };
