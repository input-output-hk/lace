import React, { createContext, useCallback, useContext, useState } from 'react';

type Token = {
  tokenId: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  available?: string;
  displayShortName: string;
  displayLongName?: string;
  logo?: string;
  metadata?: {
    image?: string;
  };
};

type NFT = {
  tokenId: string;
  name: string;
  image?: string;
};

type AssetToSend = {
  type: 'nft' | 'token';
  token: Token;
  nft?: NFT;
  amount: string;
  isShielded?: boolean;
  symbol?: string;
  currency?: string;
};

type FeeEntry = {
  amount: string;
  token: Token;
  value: string;
  currency: string;
};

type FeeRateOption = 'Average' | 'Custom' | 'Fast' | 'Low';

interface SendFlowState {
  assetInputValues: { tokenId: string; value: string }[];
  assetErrors: string[];
  addressSelected: string | null;
  assetsToSend: AssetToSend[];
  recipientAddress: string | null;
  estimatedFee: FeeEntry[];
  selectedAccountIndex: number | null;
  selectedToken?: Token;
  note?: string;
  customFeeRate?: string;
  feeRateOption?: FeeRateOption;

  setAssetInputValues: React.Dispatch<
    React.SetStateAction<{ tokenId: string; value: string }[]>
  >;
  setAssetErrors: React.Dispatch<React.SetStateAction<string[]>>;
  setAddressSelected: React.Dispatch<React.SetStateAction<string | null>>;
  setAssetsToSend: React.Dispatch<React.SetStateAction<AssetToSend[]>>;
  setRecipientAddress: React.Dispatch<React.SetStateAction<string | null>>;
  setEstimatedFee: React.Dispatch<React.SetStateAction<FeeEntry[]>>;
  setSelectedAccountIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setSelectedToken: React.Dispatch<React.SetStateAction<Token | undefined>>;
  setNote: React.Dispatch<React.SetStateAction<string>>;
  setCustomFeeRate: React.Dispatch<React.SetStateAction<string>>;
  setFeeRateOption: React.Dispatch<
    React.SetStateAction<FeeRateOption | undefined>
  >;

  resetSendFlow: () => void;
}

const SendContext = createContext<SendFlowState | undefined>(undefined);

export const SendProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [assetInputValues, setAssetInputValues] = useState<
    { tokenId: string; value: string }[]
  >([]);
  const [assetErrors, setAssetErrors] = useState<string[]>([]);
  const [addressSelected, setAddressSelected] = useState<string | null>(null);
  const [assetsToSend, setAssetsToSend] = useState<AssetToSend[]>([]);
  const [recipientAddress, setRecipientAddress] = useState<string | null>(null);
  const [estimatedFee, setEstimatedFee] = useState<FeeEntry[]>([]);
  const [selectedAccountIndex, setSelectedAccountIndex] = useState<
    number | null
  >(null);
  const [selectedToken, setSelectedToken] = useState<Token | undefined>(
    undefined,
  );
  const [note, setNote] = useState<string>('');
  const [customFeeRate, setCustomFeeRate] = useState<string>('0');
  const [feeRateOption, setFeeRateOption] = useState<FeeRateOption | undefined>(
    'Average',
  );

  const resetSendFlow = useCallback(() => {
    setAssetInputValues([]);
    setAssetErrors([]);
    setAddressSelected(null);
    setAssetsToSend([]);
    setRecipientAddress(null);
    setEstimatedFee([]);
    setFeeRateOption('Average');
    setSelectedAccountIndex(null);
    setSelectedToken(undefined);
    setNote('');
    setCustomFeeRate('0');
  }, []);

  return (
    <SendContext.Provider
      value={{
        assetInputValues,
        assetErrors,
        addressSelected,
        assetsToSend,
        recipientAddress,
        estimatedFee,
        selectedAccountIndex,
        selectedToken,
        note,
        customFeeRate,
        feeRateOption,
        setAssetInputValues,
        setAssetErrors,
        setAddressSelected,
        setAssetsToSend,
        setRecipientAddress,
        setEstimatedFee,
        setSelectedAccountIndex,
        setSelectedToken,
        resetSendFlow,
        setNote,
        setCustomFeeRate,
        setFeeRateOption,
      }}>
      {children}
    </SendContext.Provider>
  );
};

export const useSendFlow = () => {
  const context = useContext(SendContext);
  if (!context)
    throw new Error('useSendFlow must be used within a SendProvider');
  return context;
};
