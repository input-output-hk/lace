/* eslint-disable @typescript-eslint/no-empty-function */
import { cardanoCoin } from '@src/utils/constants';
import create, { SetState, GetState } from 'zustand';
import {
  OutputsMap,
  BuiltTxData,
  SpentBalances,
  OutputList,
  AssetInfo,
  FormOptions,
  SendFlowTriggerPoints
} from '../types';
import { Wallet } from '@lace/cardano';
import { calculateSpentBalance, getOutputValues } from '../helpers';
import { useCallback, useMemo } from 'react';
import { IAssetInfo } from '@src/features/send/types';
import { v4 as uuid } from 'uuid';
import omit from 'lodash/omit';
import { useWalletStore } from '@src/stores';
import { isValidAddress, isValidAddressPerNetwork } from '@src/utils/validators';
import { compactNumberWithUnit, formatNumberForDisplay } from '@src/utils/format-number';
import { isHandle } from '@lace/core';

// ====== initial values ======

const initialAssetInfoState: AssetInfo = { id: cardanoCoin.id };
const defaultOutputKey = 'output1';

const initialState = {
  isRestaking: false,
  ids: [defaultOutputKey],
  uiOutputs: {
    [defaultOutputKey]: { address: '', handle: '', assets: [{ id: cardanoCoin.id }], isHandleVerified: false }
  },
  builtTxData: {
    totalMinimumCoins: { coinMissing: '0', minimumCoin: '0' }
  },
  spentBalances: {
    [cardanoCoin.id]: '0'
  },
  isPasswordValid: true,
  isMultipleSelectionAvailable: false,
  selectedTokenList: [] as Array<string>,
  selectedNFTs: [] as Array<string>,
  isMaxAdaLoading: false
};

const MAX_TOKEN_SELECTED_ALLOW = 30;

// ====== store interface ======

export interface Store {
  ids: Array<string>;
  uiOutputs: OutputList;
  metadata?: string;
  spentBalances?: SpentBalances;
  setMetadataMsg: (metadata: string) => void;
  // ====== Built transaction ======
  builtTxData?: BuiltTxData;
  setBuiltTxData?: (tx: Partial<BuiltTxData>) => void;
  clearBuiltTxData?: () => void;
  // ====== outputs handlers ======
  setNewOutput: (id: string) => void;
  removeExistingOutput: (id: string) => void;
  setInitialOutputState: (id: string, value?: string) => void;
  // ====== outputs coins handlers ======
  setCoinValue: (id: string, asset: AssetInfo) => void;
  setCoinValues: (id: string, assets: AssetInfo[]) => void;
  setPickedCoin: (id: string, assetIds: { prev: string; next: string }) => void;
  removeCoinFromOutputs: (id: string, asset: { id: string }) => void;
  setAssetRowToOutput: (id: string, availableCoins: IAssetInfo[]) => void;
  // ====== output address handlers ======
  setAddressValue: (
    id: string,
    address: string,
    handle?: string,
    handleStatus?: {
      isVerified?: boolean;
      hasHandleOwnershipChanged?: boolean;
    }
  ) => void;
  // ====== address book picker ======
  currentRow?: string | undefined;
  currentCoinToChange?: string | undefined;
  setCurrentRow: (row: string, coinId?: string) => void;
  resetStates: () => void;
  setOutputDefaultStateOnFormSwitch: (form: FormOptions) => void;

  password?: string;
  setPassword: (pass: string) => void;
  removePassword: () => void;
  isSubmitingTx?: boolean;
  isPasswordValid?: boolean;
  setSubmitingTxState: (args: { isSubmitingTx?: boolean; isPasswordValid?: boolean }) => void;

  isMultipleSelectionAvailable?: boolean;
  setIsMultipleSelectionAvailable: (param: boolean) => void;

  selectedTokenList?: Array<string>;
  selectedNFTs?: Array<string>;
  setSelectedTokenList: (id: string, isNFT?: boolean) => void;
  removeTokenFromList: (id: string) => void;
  resetTokenList: () => void;
  addTokensToOutput: () => void;
  isRestaking: boolean;
  setIsRestaking: (param: boolean) => void;
  lastFocusedInput?: string;
  setLastFocusedInput: (param?: string) => void;
  // Analytics specific properties
  triggerPoint?: SendFlowTriggerPoints;
  setTriggerPoint: (param: SendFlowTriggerPoints) => void;
  // ====== Max Ada calculation ======
  isMaxAdaLoading: boolean;
  setMaxAdaLoading: (maxAdaInProgress?: boolean) => void;
}

// ====== state setters ======

const stateHandlers = (get: GetState<Store>, set: SetState<Store>) => {
  const setNewOutput = (nextBundleItemId: string) => {
    const id = uuid();
    const outputs = get().uiOutputs;

    set({
      ids: [...get().ids, id],
      uiOutputs: { ...outputs, [id]: { address: '', assets: [{ id: nextBundleItemId }] } }
    });
  };

  const removeExistingOutput = (id: string) => {
    const outputs = get().uiOutputs;
    const filteredIds = get().ids.filter((item) => item !== id);

    let updatedOutputs = {};

    for (const key in outputs) {
      if (key === id) continue;
      updatedOutputs = { ...updatedOutputs, [key]: outputs[key] };
    }
    set({ ids: filteredIds, uiOutputs: updatedOutputs });
  };

  const setCoinValue = (id: string, asset: AssetInfo) => {
    const outputs = get().uiOutputs;
    const output = outputs[id];

    if (!output) return;

    const list = output.assets ?? [];
    const updatedList = list.map((item) =>
      item.id === asset.id
        ? { ...item, value: asset?.value, compactValue: asset?.compactValue, displayValue: asset?.displayValue }
        : item
    );
    const updatedOutput = { ...output, assets: updatedList };
    const updatedOutputs = { ...outputs, [id]: updatedOutput };
    set({ uiOutputs: updatedOutputs });
  };

  const setCoinValues = (id: string, assets: AssetInfo[]) => {
    const outputs = get().uiOutputs;
    const output = outputs[id];

    if (!output) return;

    const updatedOutput = { ...output, assets };
    const updatedOutputs = { ...outputs, [id]: updatedOutput };
    set({ uiOutputs: updatedOutputs });
  };

  const setPickedCoin = (id: string, assetIds: { prev: string; next: string }) => {
    const outputs = get().uiOutputs;
    const output = outputs[id];

    if (!output) return;

    const list = output.assets ?? [];
    const updatedList = !assetIds.prev
      ? [...list, { id: assetIds.next }]
      : list.map((item) => (item.id === assetIds.prev ? { id: assetIds.next } : item));
    const updatedOutput = { ...output, assets: updatedList };
    const updatedOutputs = { ...outputs, [id]: updatedOutput };
    set({ uiOutputs: updatedOutputs, currentCoinToChange: assetIds.next });
  };

  const removeCoinFromOutputs = (id: string, asset: { id: string }) => {
    const outputs = get().uiOutputs;
    const output = outputs[id];

    if (!output) return;
    const list = output.assets ?? [];

    const updatedList = list.filter((item) => item.id !== asset.id);
    const updatedOutput = { ...output, assets: updatedList };
    const updatedOutputs = { ...outputs, [id]: updatedOutput };
    set({ uiOutputs: updatedOutputs });
  };

  const setAddressValue = (
    id: string,
    address: string,
    handle?: string,
    handleStatus?: {
      isVerified: boolean;
      hasHandleOwnershipChanged: boolean;
    }
    // hasHandleOwnershipChanged?: boolean,
    // isHandleVerified?: boolean
  ) => {
    const rows = get().uiOutputs;
    const row = rows[id];
    if (!row) return;
    const updatedRow = { ...row, address, handle, handleStatus };
    const outputs = { ...rows, [id]: updatedRow };

    set({ uiOutputs: outputs });
  };

  const setAssetRowToOutput = (id: string, availableCoins: IAssetInfo[]) => {
    const outputs = get().uiOutputs;
    const output = outputs[id];

    if (!output) return;

    const ids = new Set(output.assets.map((item) => item.id));
    const asset = availableCoins.find((item) => !ids.has(item.id));
    if (!asset) return;

    const updatedOutput = { ...output, assets: [...output.assets, { id: asset.id }] };
    const updatedOutputs = { ...outputs, [id]: updatedOutput };

    set({ uiOutputs: updatedOutputs });
  };

  const setOutputDefaultStateOnFormSwitch = (pickedForm: FormOptions) => {
    const outputRows = get().ids;
    const outputs = get().uiOutputs;

    const hasOneOutput = outputRows.length === 1;
    const hasOneAsset = Object.values(outputs)[0].assets.length === 1;
    const shouldKeepOnlyFirstOutput = hasOneOutput && hasOneAsset;

    // if changing from advanced to simple
    if (pickedForm === FormOptions.SIMPLE) {
      if (shouldKeepOnlyFirstOutput) {
        const [key, values] = Object.entries(outputs)[0];
        set({ uiOutputs: { [key]: { address: values.address, assets: values.assets } } });
      } else {
        get().resetStates();
      }
    }
  };

  const setSelectedTokenList = (id: string, isNFT?: boolean) => {
    const list = get().selectedTokenList;
    const nfts = get().selectedNFTs;
    if (list.length < MAX_TOKEN_SELECTED_ALLOW) {
      const updatedList = list.includes(id) ? list : [...list, id];
      const selectedNFTs = isNFT ? [...nfts, id] : nfts;

      set({ selectedTokenList: updatedList, selectedNFTs });
    }
  };

  const removeTokenFromList = (id: string) => {
    const list = get().selectedTokenList;
    const nfts = get().selectedNFTs;
    set({ selectedTokenList: list.filter((item) => item !== id), selectedNFTs: nfts.filter((item) => item !== id) });
  };

  const addTokensToOutput = () => {
    const { selectedTokenList, currentRow, uiOutputs, selectedNFTs } = get();
    let updatedOutput = uiOutputs[currentRow];

    for (const id of selectedTokenList) {
      const value = selectedNFTs.includes(id) ? '1' : '0';
      updatedOutput = {
        ...updatedOutput,
        assets: [...updatedOutput.assets, { id, value, compactValue: value }]
      };
    }

    set({
      uiOutputs: { ...uiOutputs, [currentRow]: updatedOutput },
      selectedTokenList: [],
      selectedNFTs: [],
      isMultipleSelectionAvailable: false
    });
  };

  return {
    setNewOutput,
    removeExistingOutput,
    setCoinValue,
    setCoinValues,
    setPickedCoin,
    removeCoinFromOutputs,
    setAddressValue,
    setAssetRowToOutput,
    setOutputDefaultStateOnFormSwitch,
    setSelectedTokenList,
    removeTokenFromList,
    addTokensToOutput
  };
};

// ====== store ======

const useStore = create<Store>((set, get) => ({
  ...initialState,
  ...stateHandlers(get, set),
  setBuiltTxData: (updateData) => set({ builtTxData: { ...get().builtTxData, ...updateData } }),
  clearBuiltTxData: () => set({ builtTxData: {} }),
  setCurrentRow: (row, coinId) => set({ currentRow: row, currentCoinToChange: coinId }),
  setInitialOutputState: (id, value) =>
    set({
      uiOutputs: {
        [defaultOutputKey]: {
          address: '',
          assets: value
            ? [{ id, value, compactValue: compactNumberWithUnit(value), displayValue: formatNumberForDisplay(value) }]
            : [{ id }]
        }
      }
    }),
  resetStates: () =>
    set((state) => ({
      ...state,
      ...initialState,
      currentRow: undefined,
      metadata: undefined,
      password: undefined,
      triggerPoint: undefined
    })),
  setMetadataMsg: (msg) => set({ metadata: msg }),
  setSubmitingTxState: (params) =>
    set({
      isPasswordValid: params?.isPasswordValid,
      isSubmitingTx: params?.isSubmitingTx
    }),
  setPassword: (pass) => set({ password: pass }),
  removePassword: () => set((state) => omit(state, ['password']), true),
  setIsMultipleSelectionAvailable: (param) =>
    set(
      param === false
        ? { isMultipleSelectionAvailable: param, selectedTokenList: [], selectedNFTs: [] }
        : { isMultipleSelectionAvailable: param }
    ),
  resetTokenList: () => set({ selectedTokenList: [], selectedNFTs: [] }),
  setIsRestaking: (isRestaking) => set({ isRestaking }),
  setLastFocusedInput: (lastFocusedInput) => set({ lastFocusedInput }), // keep track of the last focused input element, this way we know where to display the error
  setTriggerPoint: (triggerPoint) => set({ triggerPoint }),
  setMaxAdaLoading: (isMaxAdaLoading) => set({ isMaxAdaLoading })
}));

// ====== selectors ======

export const useOutputs = (): { ids: Array<string>; uiOutputs: OutputList } & Pick<
  Store,
  'setNewOutput' | 'removeExistingOutput' | 'setAssetRowToOutput'
> =>
  useStore(({ uiOutputs, ids, setNewOutput, removeExistingOutput, setAssetRowToOutput }) => ({
    uiOutputs,
    ids,
    setNewOutput,
    removeExistingOutput,
    setAssetRowToOutput
  }));

export type UseCoinStateSelector = { uiOutputs: AssetInfo[] } & Pick<
  Store,
  'setCoinValue' | 'setCoinValues' | 'setPickedCoin' | 'removeCoinFromOutputs'
>;

export const useCoinStateSelector = (row: string): UseCoinStateSelector =>
  useStore(
    useCallback(
      ({ uiOutputs, setCoinValue, setCoinValues, setPickedCoin, removeCoinFromOutputs }) => ({
        uiOutputs: !uiOutputs[row] ? [initialAssetInfoState] : uiOutputs[row].assets,
        setCoinValue,
        setCoinValues,
        setPickedCoin,
        removeCoinFromOutputs
      }),
      [row]
    )
  );

export const useAddressState = (
  row: string
): {
  address: string;
  handle?: string;
  handleStatus?: {
    isVerified: boolean;
    hasHandleOwnershipChanged: boolean;
  };
} & Pick<Store, 'setAddressValue'> =>
  useStore(
    useCallback(
      ({ uiOutputs, setAddressValue }) => ({
        address: !uiOutputs[row] ? '' : uiOutputs[row].address,
        handle: !uiOutputs[row] ? '' : uiOutputs[row].handle,
        handleStatus: uiOutputs[row] && {
          hasHandleOwnershipChanged: !uiOutputs[row].handleStatus
            ? true
            : uiOutputs[row].handleStatus.hasHandleOwnershipChanged,
          isVerified: !uiOutputs[row].handleStatus ? false : uiOutputs[row].handleStatus.isVerified
        },
        setAddressValue
      }),
      [row]
    )
  );

const isValidDestination = (address: string) =>
  isHandle(address) ? isHandle(address) : isValidAddress(address.trim());

export const useTransactionProps = (): {
  outputMap: OutputsMap;
  hasInvalidOutputs: boolean;
  hasOutput: boolean;
} => {
  const {
    walletUI: { cardanoCoin: coin },
    currentChain
  } = useWalletStore();
  const { outputs } = useStore(({ uiOutputs }) => ({
    outputs: uiOutputs
  }));
  const hasInvalidOutputs = useMemo(
    () =>
      Object.values(outputs).some(
        (item) =>
          !isValidDestination(item.address) ||
          !isValidAddressPerNetwork({
            address: item.address.trim(),
            network: currentChain.networkId
          }) ||
          item.assets.every((asset) => !(asset.value && Number(asset.value))) ||
          (item.handleStatus?.hasHandleOwnershipChanged !== undefined && item.handleStatus?.hasHandleOwnershipChanged)
      ),
    [outputs, currentChain]
  );

  const addressValueObj = useMemo(
    () =>
      Object.entries(outputs).map(([key, info]) => {
        const value = getOutputValues(info.assets, coin);
        let address: Wallet.Cardano.PaymentAddress | undefined;
        let handle: string;
        try {
          address = info.address ? Wallet.Cardano.PaymentAddress(info.address) : undefined;
          // handles are case-insensitive and minted as lowercase
          // https://mint.handle.me/faq#faq_5
          handle = info.handle?.toLowerCase();
        } catch {
          address = undefined;
          handle = undefined;
        }
        return [key, { address, handle, value }] as const;
      }),
    [coin, outputs]
  );

  const hasOutput = useMemo(
    () =>
      addressValueObj.some(
        ([, { value, address }]) => (value.coins && Number(value.coins)) || address || value.assets?.size > 0
      ),
    [addressValueObj]
  );

  const outputMap = useMemo(
    () =>
      new Map(
        addressValueObj.filter(([, { value }]) => (value.coins && Number(value.coins)) || value.assets?.size > 0)
      ),
    [addressValueObj]
  );

  return { hasInvalidOutputs: hasInvalidOutputs || outputMap.size === 0, outputMap, hasOutput };
};

export const useOutputInitialState = (): Store['setInitialOutputState'] =>
  useStore((state) => state.setInitialOutputState);

export const useBuiltTxState = (): Pick<Store, 'setBuiltTxData' | 'builtTxData' | 'clearBuiltTxData'> =>
  useStore(({ setBuiltTxData, builtTxData, clearBuiltTxData }) => ({ setBuiltTxData, builtTxData, clearBuiltTxData }));

export const useCurrentRow = (): [Store['currentRow'], Store['setCurrentRow']] =>
  useStore((state) => [state.currentRow, state.setCurrentRow]);

export const useResetStore = (): Store['resetStates'] => useStore((state) => state.resetStates);

export const useSetOutputDefaultStateOnFormSwitch = (): Store['setOutputDefaultStateOnFormSwitch'] =>
  useStore((state) => state.setOutputDefaultStateOnFormSwitch);

export const useMetadata = (): [Store['metadata'], Store['setMetadataMsg']] =>
  useStore((state) => [state.metadata, state.setMetadataMsg]);

export const useSubmitingState = (): {
  isRestaking: Store['isRestaking'];
  setIsRestaking: Store['setIsRestaking'];
  setSubmitingTxState: Store['setSubmitingTxState'];
  isSubmitingTx: Store['isSubmitingTx'];
  isPasswordValid: Store['isPasswordValid'];
} =>
  useStore(({ isRestaking, setIsRestaking, setSubmitingTxState, isSubmitingTx, isPasswordValid }) => ({
    isRestaking,
    setIsRestaking,
    setSubmitingTxState,
    isSubmitingTx,
    isPasswordValid
  }));

export const usePassword = (): {
  password: Store['password'];
  setPassword: Store['setPassword'];
  removePassword: Store['removePassword'];
} =>
  useStore((state) => ({
    password: state.password,
    setPassword: state.setPassword,
    removePassword: state.removePassword
  }));

export const useCurrentCoinIdToChange = (): Store['currentCoinToChange'] =>
  useStore((state) => state?.currentCoinToChange);

export const useSpentBalances = (): Store['spentBalances'] => {
  const uiOutputs = useStore((state) => state.uiOutputs);

  return useMemo(() => calculateSpentBalance(uiOutputs), [uiOutputs]);
};

export const useMultipleSelection = (): [
  Store['isMultipleSelectionAvailable'],
  Store['setIsMultipleSelectionAvailable']
] =>
  useStore(({ isMultipleSelectionAvailable, setIsMultipleSelectionAvailable }) => [
    isMultipleSelectionAvailable,
    setIsMultipleSelectionAvailable
  ]);

export const useSelectedTokenList = (): {
  removeTokenFromList: (id: string) => void;
  setSelectedTokenList: (id: string, isNFT?: boolean) => void;
  selectedTokenList: string[];
  addTokensToOutput: () => void;
  resetTokenList: () => void;
} =>
  useStore(({ removeTokenFromList, setSelectedTokenList, selectedTokenList, addTokensToOutput, resetTokenList }) => ({
    removeTokenFromList,
    setSelectedTokenList,
    selectedTokenList,
    addTokensToOutput,
    resetTokenList
  }));

export const useLastFocusedInput = (): {
  lastFocusedInput: Store['lastFocusedInput'];
  setLastFocusedInput: Store['setLastFocusedInput'];
} =>
  useStore(({ setLastFocusedInput, lastFocusedInput }) => ({
    lastFocusedInput,
    setLastFocusedInput
  }));

export const useAnalyticsSendFlowTriggerPoint = (): {
  triggerPoint: Store['triggerPoint'];
  setTriggerPoint: Store['setTriggerPoint'];
} => useStore(({ triggerPoint, setTriggerPoint }) => ({ triggerPoint, setTriggerPoint }));

export const useMaxAdaStatus = (): Pick<Store, 'isMaxAdaLoading' | 'setMaxAdaLoading'> =>
  useStore(({ isMaxAdaLoading, setMaxAdaLoading }) => ({ isMaxAdaLoading, setMaxAdaLoading }));

export { useStore as sendTransactionStore };
