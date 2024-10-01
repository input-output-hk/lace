/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-confusing-void-expression */
/* eslint-disable react/no-multi-comp */
import React from 'react';

import { InfoOutlineIcon } from '@chakra-ui/icons';
import { Box, Text, Spinner } from '@chakra-ui/react';
import {
  createStore,
  action,
  StoreProvider,
  persist,
  useStoreRehydrated,
  createTypedHooks,
} from 'easy-peasy';

import { sendStore } from './app/pages/send';

import type { AssetInput } from '../types/assets';
import type { Wallet } from '@lace/cardano';
import type { Action } from 'easy-peasy';

interface RouteModel {
  route: string | null;
  setRoute: Action<RouteModel, string>;
}

interface Address {
  result: string;
  display: string;
  error?: string;
}

interface Value {
  ada: string;
  assets: AssetInput[];
  minAda: string;
  personalAda: string;
}

interface SendModel {
  address: Address;
  setAddress: Action<SendModel, Address>;
  value: Value;
  setValue: Action<SendModel, Value>;
}

interface LaceSwitchModel {
  isLaceSwitchInProgress: boolean;
  setIsLaceSwitchInProgress: Action<LaceSwitchModel, boolean>;
}

const routeStore: RouteModel = {
  route: null,
  setRoute: action((state, route) => {
    // eslint-disable-next-line functional/immutable-data
    state.route = route;
  }),
};

const globalModel = persist(
  {
    routeStore,
    sendStore: sendStore as SendModel,
    laceSwitchStore: {
      isLaceSwitchInProgress: false,
      setIsLaceSwitchInProgress: action((state, isLaceSwitchInProgress) => {
        state.isLaceSwitchInProgress = isLaceSwitchInProgress;
      }),
    } as LaceSwitchModel,
  },
  { storage: 'localStorage' },
);

interface GlobalModel {
  globalModel: {
    routeStore: RouteModel;
    sendStore: SendModel;
    laceSwitchStore: LaceSwitchModel;
  };
}

const typedHooks = createTypedHooks<GlobalModel>();

export const useStoreActions = typedHooks.useStoreActions;
export const useStoreDispatch = typedHooks.useStoreDispatch;
export const useStoreState = typedHooks.useStoreState;

// create the global store object
const store = createStore<GlobalModel>({
  globalModel,
});

// Store component that loads the store and calls initStore
const StoreInit = ({
  children,
  environmentName,
}: Readonly<{
  children: React.ReactNode;
  environmentName: Wallet.ChainName;
}>) => {
  const isRehydrated = useStoreRehydrated();

  return (
    <>
      {isRehydrated ? (
        <>
          {children}
          {/* Settings Overlay */}
          {environmentName !== 'Mainnet' && (
            <Box
              position="absolute"
              left="3"
              bottom="3"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontWeight="semibold"
              color="orange.400"
            >
              <InfoOutlineIcon />
              <Box width="1" />
              <Text>{environmentName}</Text>
            </Box>
          )}
        </>
      ) : (
        <Box
          height="100%"
          width="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Spinner color="teal" speed="0.5s" />
        </Box>
      )}
    </>
  );
};

// wrapping the StoreInit component inside the actual StoreProvider in order to initialize the store state
export const Store = ({
  children,
  environmentName,
}: Readonly<{
  children: React.ReactNode;
  environmentName: Wallet.ChainName;
}>) => (
  <StoreProvider store={store}>
    <StoreInit environmentName={environmentName}>{children}</StoreInit>
  </StoreProvider>
);
