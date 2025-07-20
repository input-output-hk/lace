/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable unicorn/no-null */
/* eslint-disable no-magic-numbers */
/* eslint-disable react/no-multi-comp */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Layout, SectionLayout, EducationalList } from '@src/views/browser-view/components';
import { useTranslation } from 'react-i18next';
import { Modal, Skeleton, Typography } from 'antd';
import styles from './swapsContainer.module.scss';
import { SectionTitle } from '@components/Layout/SectionTitle';
import { Button, Card, Flex, PasswordBox, Select, TextBox } from '@input-output-hk/lace-ui-toolkit';
import LightBulb from '@src/assets/icons/light.svg';
import { getTokenList } from '@src/utils/get-token-list';
import { Drawer, DrawerHeader, DrawerNavigation, useObservable, Switch } from '@lace/common';
import { useAssetInfo, useFetchCoinPrice } from '@hooks';
import { useWalletStore } from '@src/stores';
import { DEFAULT_WALLET_BALANCE } from '@src/utils/constants';
import { Wallet } from '@lace/cardano';
import {
  createTxInspector,
  Milliseconds,
  Serialization,
  tokenTransferInspector,
  TokenTransferValue,
  TransactionSummaryInspection,
  transactionSummaryInspector
} from '@cardano-sdk/core';
import { DappTransaction, TxDetailsCBOR, useSecrets } from '@lace/core';
import { useAddressBookContext, withAddressBookContext } from '@src/features/address-book/context';
import { getProviders } from '@src/stores/slices';
import { createWalletAssetProvider } from '@cardano-sdk/wallet';
import { useComputeTxCollateral } from '@hooks/useComputeTxCollateral';
import { useCurrencyStore } from '@providers';
import { eraSlotDateTime } from '@src/utils/era-slot-datetime';
import { AddressBookSchema, useDbStateValue } from '@lib/storage';
import { getAllWalletsAddresses } from '@src/utils/get-all-wallets-addresses';
import { walletRepository, withSignTxConfirmation } from '@lib/wallet-api-ui';
import noop from 'lodash/noop';

// TODO: abstract to be provider agnostic
// TODO: API error handling/messages
// TODO: close on wallet success
// TODO: fees mapping/abstracting
// TODO: dedupe, reduce complexity
// TODO: overwrite defaults with posthog
// TODO: deal with inputs timeout bug, might only be an issue in development mode

const { Title, Text } = Typography;

const TIMEOUT = 6000 as Milliseconds;
const logger = console;
const SLIPPAGE_PERCENTAGES = [0.1, 0.3, 0.5]; // TODO: get from posthog
const INITIAL_SLIPPAGE = 3;
const LOVELACE_TOKEN_ID = 'lovelace';
const LOVELACE_HEX_ID = 'lovelace414441';

// API responses
interface SwapEstimateResponse {
  tokenA: string;
  quantityA: number;
  tokenB: string;
  quantityB: number;
  totalFee: number;
  totalDeposit: number;
  steelswapFee: number;
  bonusOut: number;
  price: number;
  pools?: [
    {
      dex: string;
      poolId: string;
      quantityA: number;
      quantityB: number;
      batcherFee: number;
      deposit: number;
      volumeFee: number;
    }
  ];
}
interface BuildSwapResponse {
  tx: string; // A hex encoded, unsigned transaction.
  p: boolean; // , whether to use partial signing.
}

export const getDexList = async (): Promise<string[]> => {
  // https://apidev.steelswap.io/docs#/dex/available_dexs_dex_list__get
  const response = await window.fetch(`${process.env.SWAPS_API_SECURE_URL}/dex/list/`, { method: 'GET' });

  if (!response.ok) {
    throw new Error('Unexpected response');
  }

  return (await response.json()) as string[];
};

export const getSwappableTokensList = async (): Promise<TokenListFetchResponse[]> => {
  // https://apidev.steelswap.io/docs#/tokens/get_tokens_tokens_list__get
  const response = await window.fetch(`${process.env.SWAPS_API_SECURE_URL}/tokens/list/`, { method: 'GET' });

  if (!response.ok) {
    throw new Error('Unexpected response');
  }

  return (await response.json()) as TokenListFetchResponse[];
};

const SwapsContext = createContext<SwapProvider | null>(null);

export const useSwaps = (): SwapProvider => {
  const context = useContext(SwapsContext);
  if (context === null) throw new Error('ThemeContext not defined');
  return context;
};

export const feesMapper = () => {
  // TODO
};

const convertQuantityToLovelace = (quantity: string, tokenId: string, predictFromOutput: boolean): string => {
  const shouldConvert =
    (tokenId === LOVELACE_TOKEN_ID && !predictFromOutput) || (tokenId === LOVELACE_HEX_ID && predictFromOutput);

  return shouldConvert ? Wallet.util.adaToLovelacesString(quantity) : quantity;
};

type CreateSwapRequestBodySwaps = {
  tokenA: string;
  tokenB: string | undefined;
  quantity: string;
  predictFromOutputAmount: boolean;
  ignoredDexs: string[];
  address?: Wallet.Cardano.PaymentAddress;
  targetSlippage?: number;
  collateral?: Wallet.Cardano.Utxo[];
  utxos?: Wallet.Cardano.Utxo[];
};

const createApiHeaders = () => ({
  Accept: 'application/json, text/plain, */*',
  token: process.env.STEELSWAP_TOKEN,
  'Content-Type': 'application/json'
  // 'sec-fetch-mode': 'cors',
  // 'Accept-Encoding': 'gzip, deflate, br'
});

const createSwapRequestBody = ({
  tokenA,
  tokenB,
  quantity,
  predictFromOutputAmount,
  ignoredDexs,
  address,
  targetSlippage,
  collateral,
  utxos
}: CreateSwapRequestBodySwaps) => {
  // Estimate only
  const baseBody = {
    tokenA,
    tokenB,
    quantity: Number(convertQuantityToLovelace(quantity, tokenA, predictFromOutputAmount)),
    predictFromOutputAmount,
    ignoreDexes: ignoredDexs,
    partner: '',
    hop: true,
    da: [] as const
  };

  // Additional build requirements
  if (address && targetSlippage !== undefined && collateral && utxos) {
    return {
      ...baseBody,
      address,
      slippage: Number(targetSlippage) * 100,
      forwardAddress: '',
      feeAdust: true,
      collateral: collateral.map((core) => Serialization.TransactionUnspentOutput.fromCore(core).toCbor()),
      pAddress: '',
      utxos: utxos.map((core) => Serialization.TransactionUnspentOutput.fromCore(core).toCbor()),
      ttl: 900
    };
  }

  return baseBody;
};

export const SwapsProvider = (): React.ReactElement => {
  // required data sources
  const { inMemoryWallet } = useWalletStore();
  const utxos = useObservable(inMemoryWallet.utxo.available$);
  const collateral = useObservable(inMemoryWallet.utxo.unspendable$);
  const addresses = useObservable(inMemoryWallet.addresses$);

  // swaps interface
  const [tokenA, setTokenA] = useState<string>('lovelace');
  const [tokenB, setTokenB] = useState<string>();
  const [quantity, setQuantity] = useState<string>('');
  const [predictFromOutputAmount, setPredictFromOutputAmount] = useState(false);
  const [dexTokenList, setDexTokenList] = useState<TokenListFetchResponse[]>([]);

  // settings
  const [dexList, setDexList] = useState([]);
  const [ignoredDexs, setIgnoredDexs] = useState<string[]>([]);
  const [targetSlippage, setTargetSlippage] = useState<number>(INITIAL_SLIPPAGE);

  // estimate swap
  const [estimate, setEstimate] = useState(null);
  useEffect(() => {
    if (!quantity || !tokenA || !tokenB) {
      return;
    }

    const fetchEstimate = async () => {
      // https://apidev.steelswap.io/docs#/swap/steel_swap_swap_estimate__post
      const postBody = JSON.stringify(
        createSwapRequestBody({
          tokenA,
          tokenB,
          quantity,
          predictFromOutputAmount,
          ignoredDexs
        })
      );

      const response = await window.fetch(`${process.env.SWAPS_API_SECURE_URL}/swap/estimate/`, {
        method: 'POST',
        headers: createApiHeaders(),
        body: postBody
      });
      if (!response.ok) {
        throw new Error('Unexpected response');
      }

      const parsedResponse = (await response.json()) as SwapEstimateResponse;
      setEstimate(parsedResponse);
    };
    fetchEstimate();
  }, [tokenA, tokenB, quantity, ignoredDexs, predictFromOutputAmount]);

  const fetchDexList = () => {
    getDexList()
      .then((response) => {
        setDexList(response);
      })
      .catch((error) => {
        throw new Error(error);
      });
  };

  const fetchSwappableTokensList = () => {
    getSwappableTokensList()
      .then((response) => {
        setDexTokenList(response);
      })
      .catch((error) => {
        throw new Error(error);
      });
  };

  // Build swap
  const [unsignedTx, setBuildResponse] = useState<BuildSwapResponse | null>();
  const buildSwap = useCallback(
    async (cb: () => void) => {
      // https://apidev.steelswap.io/docs#/swap/build_swap_swap_build__post
      const postBody = JSON.stringify(
        createSwapRequestBody({
          tokenA,
          tokenB,
          quantity,
          predictFromOutputAmount,
          ignoredDexs,
          address: addresses?.[0]?.address,
          slippage: Number(targetSlippage) * 100,
          forwardAddress: '',
          collateral: collateral.map((core) => Serialization.TransactionUnspentOutput.fromCore(core).toCbor()),
          utxos: utxos.map((core) => Serialization.TransactionUnspentOutput.fromCore(core).toCbor())
        })
      );

      const response = await window.fetch(`${process.env.SWAPS_API_SECURE_URL}/swap/build/`, {
        method: 'POST',
        headers: createApiHeaders(),
        body: postBody
      });
      if (!response.ok) {
        throw new Error('Unexpected response');
      }

      const parsedResponse = (await response.json()) as BuildSwapResponse;
      setBuildResponse(parsedResponse);
      cb();
    },
    [addresses, tokenA, tokenB, quantity, targetSlippage, collateral, ignoredDexs, predictFromOutputAmount, utxos]
  );

  // Sign swap
  const signAndSubmitSwapRequest = useCallback(async () => {
    try {
      const finalTx = await inMemoryWallet.finalizeTx({ tx: unsignedTx.tx });
      const unsignedTxFromCbor = Serialization.Transaction.fromCbor(unsignedTx.tx);
      unsignedTxFromCbor.setWitnessSet(Serialization.TransactionWitnessSet.fromCore(finalTx.witness));
      await inMemoryWallet.submitTx(unsignedTxFromCbor.toCbor());
    } catch (error) {
      console.log('error', error);
    }
  }, [unsignedTx, inMemoryWallet]);

  const contextValue: SwapProvider = {
    tokenA,
    setTokenA,
    tokenB,
    setTokenB,
    quantity,
    setQuantity,
    setPredictFromOutputAmount,
    dexList,
    dexTokenList,
    fetchDexList,
    fetchSwappableTokensList,
    estimate,
    unsignedTx,
    buildSwap,
    targetSlippage,
    setTargetSlippage,
    signAndSubmitSwapRequest,
    ignoredDexs,
    setIgnoredDexs
  };

  return (
    <SwapsContext.Provider value={contextValue}>
      <SwapsContainer />
    </SwapsContext.Provider>
  );
};

// Heavy duplication and extraction from DappTransactionContainer
const SwapSummary = withAddressBookContext(() => {
  const { unsignedTx } = useSwaps();
  const {
    walletInfo,
    inMemoryWallet,
    blockchainProvider: { assetProvider },
    walletUI: { cardanoCoin },
    walletState
  } = useWalletStore();

  const ownAddresses = useObservable(inMemoryWallet.addresses$)?.map((a) => a.address);
  const { list: addressBook } = useAddressBookContext() as useDbStateValue<AddressBookSchema>;
  const addressToNameMap = new Map(addressBook?.map((entry) => [entry.address as string, entry.name]));

  const { fiatCurrency } = useCurrencyStore();
  const { priceResult } = useFetchCoinPrice();
  const [fromAddressTokens, setFromAddressTokens] = useState<
    Map<Wallet.Cardano.PaymentAddress, TokenTransferValue> | undefined
  >();
  const [toAddressTokens, setToAddressTokens] = useState<
    Map<Wallet.Cardano.PaymentAddress, TokenTransferValue> | undefined
  >();
  const [transactionInspectionDetails, setTransactionInspectionDetails] = useState<
    TransactionSummaryInspection | undefined
  >();

  const { inputResolver } = getProviders();

  const tx: Wallet.Cardano.Tx = Serialization.TxCBOR.deserialize(unsignedTx.tx);
  const txCollateral = useComputeTxCollateral(inputResolver, walletState, tx);

  const userAddresses = useMemo(() => walletInfo.addresses.map((v) => v.address), [walletInfo.addresses]);
  const userRewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
  const rewardAccountsAddresses = useMemo(() => userRewardAccounts?.map((key) => key.address), [userRewardAccounts]);
  const protocolParameters = useObservable(inMemoryWallet?.protocolParameters$);
  const eraSummaries = useObservable(inMemoryWallet?.eraSummaries$);
  const allWalletsAddresses = [...userAddresses, ...getAllWalletsAddresses(useObservable(walletRepository.wallets$))];

  useEffect(() => {
    if (!tx || !protocolParameters) {
      setTransactionInspectionDetails(void 0);
      return;
    }
    const getTxSummary = async () => {
      const inspector = createTxInspector({
        tokenTransfer: tokenTransferInspector({
          inputResolver,
          fromAddressAssetProvider: createWalletAssetProvider({
            assetProvider,
            assetInfo$: inMemoryWallet.assetInfo$,
            logger
          }),
          toAddressAssetProvider: createWalletAssetProvider({
            assetProvider,
            assetInfo$: inMemoryWallet.assetInfo$,
            tx,
            logger
          }),
          timeout: TIMEOUT,
          logger
        }),
        summary: transactionSummaryInspector({
          addresses: userAddresses,
          rewardAccounts: rewardAccountsAddresses,
          inputResolver,
          protocolParameters,
          assetProvider: createWalletAssetProvider({
            assetProvider,
            assetInfo$: inMemoryWallet.assetInfo$,
            tx,
            logger
          }),
          timeout: TIMEOUT,
          logger
        })
      });

      const { summary, tokenTransfer } = await inspector(tx as Wallet.Cardano.HydratedTx);

      const { toAddress, fromAddress } = tokenTransfer;
      setToAddressTokens(toAddress);
      setFromAddressTokens(fromAddress);
      setTransactionInspectionDetails(summary);
    };
    getTxSummary();
  }, [
    tx,
    walletInfo.addresses,
    userAddresses,
    rewardAccountsAddresses,
    inputResolver,
    protocolParameters,
    assetProvider,
    inMemoryWallet.assetInfo$
  ]);

  const dappInfo = {
    name: 'steelswap',
    url: '',
    logo: ''
  };

  return (
    <Flex flexDirection="column" justifyContent="space-between" alignItems="stretch">
      {tx && transactionInspectionDetails && dappInfo ? (
        <>
          <DappTransaction
            fiatCurrencyCode={fiatCurrency?.code}
            fiatCurrencyPrice={priceResult?.cardano?.price}
            coinSymbol={cardanoCoin.symbol}
            txInspectionDetails={transactionInspectionDetails}
            dappInfo={dappInfo}
            fromAddress={fromAddressTokens}
            // errorMessage={errorMessage}
            toAddress={toAddressTokens}
            collateral={txCollateral}
            expiresBy={eraSlotDateTime(eraSummaries, tx.body.validityInterval?.invalidHereafter)}
            ownAddresses={allWalletsAddresses.length > 0 ? allWalletsAddresses : ownAddresses}
            addressToNameMap={addressToNameMap}
          />
          <TxDetailsCBOR cbor={unsignedTx.tx} />
        </>
      ) : (
        <Skeleton loading />
      )}
    </Flex>
  );
});

export interface TokenListFetchResponse {
  ticker: string;
  name: string;
  policyId: string;
  policyName: string;
  decimals: number;
  priceNumerator: number;
  priceDenominator: number;
  sources: string[];
}

interface SwapProvider {
  tokenA: string;
  setTokenA: React.Dispatch<React.SetStateAction<string>>;
  tokenB: string;
  setTokenB: React.Dispatch<React.SetStateAction<string>>;
  quantity: string;
  setQuantity: React.Dispatch<React.SetStateAction<string>>;
  setPredictFromOutputAmount: React.Dispatch<React.SetStateAction<boolean>>;
  dexList: string[];
  estimate?: SwapEstimateResponse;
  dexTokenList: TokenListFetchResponse[];
  fetchDexList: () => void;
  fetchSwappableTokensList: () => void;
  buildSwap: (cb: () => void) => void;
  signAndSubmitSwapRequest: () => Promise<void>;
  targetSlippage: number;
  setTargetSlippage: React.Dispatch<React.SetStateAction<number>>;
  unsignedTx: BuildSwapResponse;
  ignoredDexs: string[];
  setIgnoredDexs: React.Dispatch<React.SetStateAction<string[]>>;
}

export const SwapsContainer = (): React.ReactElement => {
  const { t } = useTranslation();
  const { setPassword, password } = useSecrets();

  const {
    tokenA,
    setTokenA,
    tokenB,
    setTokenB,
    fetchDexList,
    fetchSwappableTokensList,
    buildSwap,
    ignoredDexs,
    estimate,
    dexList,
    dexTokenList,
    setQuantity,
    setIgnoredDexs,
    signAndSubmitSwapRequest,
    setPredictFromOutputAmount,
    targetSlippage,
    unsignedTx,
    setTargetSlippage
  } = useSwaps();

  const [step, setStep] = useState<'estimate' | 'summary' | 'sign'>('summary');

  const { inMemoryWallet, isHardwareWallet } = useWalletStore();
  const [isSlippageModalVisible, setIsSlippageModalVisible] = useState(false);
  const assetsInfo = useAssetInfo();
  const assetsBalance = useObservable(inMemoryWallet.balance.utxo.total$, DEFAULT_WALLET_BALANCE.utxo.total$);
  const { tokenList: swappableTokens } = getTokenList({
    assetsInfo,
    balance: assetsBalance?.assets,
    fiatCurrency: null
  });

  const titles = {
    glossary: t('educationalBanners.title.glossary'),
    faq: t('educationalBanners.title.faq'),
    video: t('educationalBanners.title.video')
  };

  useEffect(() => {
    fetchDexList();
    fetchSwappableTokensList();
  }, []);

  const educationalItems = [
    {
      title: titles.faq,
      subtitle: 'What are swaps?',
      src: LightBulb,
      link: `${process.env.WEBSITE_URL}/faq?question=what-are-swaps`
    },
    {
      title: titles.faq,
      subtitle: 'Can I cancel a swap?',
      src: LightBulb,
      link: `${process.env.WEBSITE_URL}/faq?question=can-swaps-be-cancelled`
    },
    {
      title: titles.faq,
      subtitle: 'What is slippage?',
      src: LightBulb,
      link: `${process.env.WEBSITE_URL}/faq?question=what-is-slippage`
    }
  ];

  const sidePanel = (
    <Flex flexDirection="column" alignItems="stretch" gap="$32" mb="$112">
      <EducationalList items={educationalItems} title={'About swaps'} />
    </Flex>
  );

  return (
    <Layout>
      <SectionLayout sidePanelContent={sidePanel}>
        <SectionTitle title={'Swaps'} />
        <Card.Outlined style={{ padding: 16 }}>
          <Flex gap={'$8'} justifyContent="space-between">
            <Flex flexDirection={'column'} gap="$16" w={'$fill'}>
              <Flex flexDirection={'column'}>
                <Title level={3}>You swap</Title>
                <Card.Outlined style={{ backgroundColor: '#F9F9F9' }}>
                  <Flex flexDirection={'row'} w="$fill" alignItems={'center'} pl="$4" gap={'$4'}>
                    <Select.Root
                      align="selected"
                      variant="outline"
                      showArrow
                      value={tokenA || ''}
                      onChange={(v) => {
                        setTokenA(v);
                      }}
                    >
                      <Select.Item title="ADA" value="lovelace" />
                      {swappableTokens.map((token) => (
                        <Select.Item
                          key={`${token.assetId}-${token.name}`}
                          title={token.name}
                          value={Buffer.from(token.assetId).toString('hex')}
                        />
                      ))}
                    </Select.Root>
                    <TextBox
                      label=""
                      onChange={(e) => {
                        setQuantity(e.target.value);
                        setPredictFromOutputAmount(false);
                      }}
                      placeholder="0"
                    />
                  </Flex>
                </Card.Outlined>
              </Flex>
              <Flex flexDirection={'column'}>
                <Title level={3}>To receive</Title>
                <Card.Outlined style={{ backgroundColor: '#F9F9F9' }}>
                  <Flex flexDirection={'row'} w="$fill" alignItems={'center'} pl="$4" gap={'$4'}>
                    <Select.Root
                      align="selected"
                      variant="outline"
                      showArrow
                      value={tokenB}
                      onChange={(v) => {
                        setTokenB(v);
                      }}
                    >
                      {dexTokenList.map((token) => (
                        <Select.Item
                          key={`${token.name}-${token.policyId}`}
                          title={token.name}
                          value={`${token.policyId}${Buffer.from(token.ticker).toString('hex')}`}
                        />
                      ))}
                    </Select.Root>
                    <TextBox
                      label=""
                      onChange={(e) => {
                        setPredictFromOutputAmount(true);
                        setQuantity(e.target.value);
                      }}
                      placeholder="0"
                    />
                  </Flex>
                </Card.Outlined>
              </Flex>
              {!!estimate && (
                <Flex flexDirection={'column'} w="$fill">
                  <Card.Greyed style={{ width: '100%' }}>
                    <Flex flexDirection={'column'} w="$fill" p={'$8'}>
                      <Title level={4}>Fees</Title>
                      <Flex justifyContent={'space-between'}>
                        <Text>SteelSwap Fees {Wallet.util.lovelacesToAdaString(estimate.steelswapFee.toString())}</Text>
                      </Flex>
                      <Flex justifyContent={'space-between'}>
                        <Text>
                          Deposits (returned) {Wallet.util.lovelacesToAdaString(estimate.totalDeposit.toString())}
                        </Text>
                      </Flex>
                      <Flex justifyContent={'space-between'}>
                        <Text>Total Fees {Wallet.util.lovelacesToAdaString(estimate.totalFee.toString())}</Text>
                      </Flex>
                      <Flex justifyContent={'space-between'}>
                        <Text>Price {estimate.price}</Text>
                      </Flex>
                    </Flex>
                  </Card.Greyed>
                </Flex>
              )}
              {estimate && (
                <Button.CallToAction
                  label="Proceed"
                  onClick={() => {
                    buildSwap(() => setStep('summary'));
                  }}
                />
              )}
            </Flex>
            <Flex flexDirection={'column'} gap="$4" w="$294">
              <Button.CallToAction
                label={`Slippage ${targetSlippage}%`}
                onClick={() => setIsSlippageModalVisible(!isSlippageModalVisible)}
                w="$fill"
              />
              <Title level={3}>Available DEX's</Title>
              <Flex flexDirection={'column'} w="$fill" gap={'$4'}>
                {dexList?.map((dex) => (
                  <Flex key={dex} w={'$fill'} justifyContent={'space-between'}>
                    <Text>{dex}</Text>
                    <Switch
                      checked={!ignoredDexs.includes(dex)}
                      onChange={(checked) =>
                        checked
                          ? setIgnoredDexs(ignoredDexs.filter((d) => d !== dex))
                          : setIgnoredDexs([...ignoredDexs, dex])
                      }
                    />
                  </Flex>
                ))}
              </Flex>
            </Flex>
          </Flex>
        </Card.Outlined>
        {/* modals */}
        <Modal footer={null} className={styles.modal} open={isSlippageModalVisible} centered closable={false}>
          <Title level={3}>Slippage Settings</Title>
          <Flex className={styles.modalColumn} w="$fill">
            <Flex className={styles.slippageBlock} w="$fill">
              {SLIPPAGE_PERCENTAGES.map((suggestedPercentage) => {
                const Component = targetSlippage === suggestedPercentage ? Button.CallToAction : Button.Secondary;
                return (
                  <Component
                    w={'$fill'}
                    key={`suggested-percentage-${suggestedPercentage}`}
                    onClick={() => setTargetSlippage(suggestedPercentage)}
                    label={`${suggestedPercentage.toString()}%`}
                  />
                );
              })}
            </Flex>
            <Flex w={'$fill'}>
              <TextBox
                containerStyle={{ flex: 1 }}
                w="$fill"
                label="custom amount"
                value={targetSlippage?.toString()}
              />
            </Flex>
            <Flex className={styles.buttons} w="$fill" justifyContent={'flex-end'}>
              <Button.Primary
                onClick={() => setIsSlippageModalVisible(false)}
                data-testid="set-slippage-btn"
                label="Save changes"
                w={'$fill'}
              />
            </Flex>
          </Flex>
        </Modal>
        {/* Confirmation drawer */}
        {step === 'summary' && !!unsignedTx?.tx && (
          <Drawer
            open={step === 'summary'}
            onClose={() => setStep('estimate')}
            title={<DrawerHeader title={'Summary'} />}
            navigation={<DrawerNavigation title={'back'} onCloseIconClick={() => setStep('estimate')} />}
            dataTestId="swap-summary-drawer"
            footer={
              <div>
                <Button.Primary
                  label={'proceed to sign'}
                  onClick={() => {
                    isHardwareWallet ? signAndSubmitSwapRequest() : setStep('sign');
                  }}
                />
              </div>
            }
          >
            <SwapSummary />
          </Drawer>
        )}
        {/* Sign drawer */}
        {step === 'sign' && (
          <Drawer
            open={step === 'sign'}
            onClose={() => setStep('estimate')}
            title={<DrawerHeader title={'Sign'} />}
            navigation={<DrawerNavigation title={'back'} onCloseIconClick={() => setStep('estimate')} />}
            dataTestId="swap-sign-drawer"
            footer={
              <div>
                <Button.Primary
                  label={'submit'}
                  onClick={async () => {
                    await withSignTxConfirmation(signAndSubmitSwapRequest, password.value);
                  }}
                />
              </div>
            }
          >
            <PasswordBox onSubmit={noop} label="confirm password" onChange={setPassword} />
          </Drawer>
        )}
      </SectionLayout>
    </Layout>
  );
};
