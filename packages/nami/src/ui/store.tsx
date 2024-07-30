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

// import {
//   getCurrency,
//   getNetwork,
//   setCurrency,
//   setNetwork,
// } from './api/extension';

import { NETWORK_ID, NODE } from '../config/config';

import { sendStore } from './app/pages/send';

import type { AssetInput } from '../types/assets';
import type { Action, Actions } from 'easy-peasy';

interface Network {
  id: string;
  node: string /* NODE[NETWORK_ID] */;
}

interface Settings {
  currency: string;
  network: Network;
  adaSymbol: string;
}

interface SettingsModel {
  settings: Settings | null;
  setSettings: Action<SettingsModel, Settings>;
}

const settings: SettingsModel = {
  settings: null,
  setSettings: action((state, settings) => {
    // setCurrency(settings.currency);
    // setNetwork(settings.network);
    // eslint-disable-next-line functional/immutable-data
    state.settings = {
      ...settings,
      adaSymbol: settings.network.id === NETWORK_ID.mainnet ? '₳' : 't₳',
    };
  }),
};

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
  },
  { storage: 'localStorage' },
);

const initSettings = async (
  // eslint-disable-next-line functional/prefer-immutable-types
  setSettings: Actions<GlobalModel>['settings']['setSettings'],
): Promise<void> => {
  // const currency = await getCurrency();
  // const network = await getNetwork();
  const currency = 'usd';
  const network = { id: NETWORK_ID.mainnet, node: NODE.mainnet };
  await Promise.resolve(void 0);
  setSettings({
    currency: currency,
    network: { id: NETWORK_ID.mainnet, node: NODE.mainnet },
    adaSymbol: network.id === NETWORK_ID.mainnet ? '₳' : 't₳',
  });
};

interface GlobalModel {
  globalModel: {
    routeStore: RouteModel;
    sendStore: SendModel;
  };
  settings: SettingsModel;
}

const typedHooks = createTypedHooks<GlobalModel>();

export const useStoreActions = typedHooks.useStoreActions;
export const useStoreDispatch = typedHooks.useStoreDispatch;
export const useStoreState = typedHooks.useStoreState;

// create the global store object
const store = createStore<GlobalModel>({
  globalModel,
  settings,
});

// sets the initial store state
const initStore = async (
  actions: Readonly<Actions<GlobalModel>>,
): Promise<void> => {
  await initSettings(actions.settings.setSettings);
};

// Store component that loads the store and calls initStore
const StoreInit: React.FC = ({ children }) => {
  const actions = useStoreActions(actions => actions);
  actions.settings.setSettings;
  const state = useStoreState(state => state);
  const settings = state.settings.settings;
  const [isLoading, setIsLoading] = React.useState(true);
  const isRehydrated = useStoreRehydrated();

  const init = React.useCallback(async () => {
    await initStore(actions);
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    init();
  }, []);
  return (
    <>
      {isLoading || !isRehydrated ? (
        <>
          <Box
            height="100%"
            width="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Spinner color="teal" speed="0.5s" />
          </Box>
        </>
      ) : (
        <>
          {children}
          {/* Settings Overlay */}
          {settings && settings.network.id !== NETWORK_ID.mainnet && (
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
              <Text>
                {((): string | undefined => {
                  switch (settings.network.id) {
                    case NETWORK_ID.testnet: {
                      return 'Testnet';
                    }
                    case NETWORK_ID.preview: {
                      return 'Preview';
                    }
                    case NETWORK_ID.preprod: {
                      return 'Preprod';
                    }
                  }
                })()}
              </Text>
            </Box>
          )}
        </>
      )}
    </>
  );
};

// wrapping the StoreInit component inside the actual StoreProvider in order to initialize the store state
export const Store: React.FC = ({ children }) => {
  return (
    <StoreProvider store={store}>
      <StoreInit>{children}</StoreInit>
    </StoreProvider>
  );
};
