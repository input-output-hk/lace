/* eslint-disable unicorn/consistent-function-scoping */
/* eslint-disable unicorn/prefer-logical-operator-over-ternary */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable unicorn/prefer-string-slice */
/* eslint-disable unicorn/no-new-array */
/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/naming-convention */
import type { RefObject } from 'react';
import React, { useCallback, useMemo } from 'react';

import { Cardano, Serialization, ProviderUtil } from '@cardano-sdk/core';
import {
  CheckIcon,
  ChevronLeftIcon,
  CloseIcon,
  SmallCloseIcon,
} from '@chakra-ui/icons';
import {
  Box,
  Stack,
  Text,
  Button,
  Avatar,
  IconButton,
  Input,
  InputGroup,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  useDisclosure,
  InputRightElement,
  InputLeftElement,
  Spinner,
  useColorModeValue,
  useToast,
  Icon,
} from '@chakra-ui/react';
import { useObservable } from '@lace/common';
import debouncePromise from 'debounce-promise';
import { debounce } from 'lodash';
import latest from 'promise-latest';
import { MdModeEdit } from 'react-icons/md';
import { Planet } from 'react-kawaii';
import MiddleEllipsis from 'react-middle-ellipsis';
import { NumericFormat } from 'react-number-format';
import { useHistory } from 'react-router-dom';
import { FixedSizeList as List } from 'react-window';
import useConstant from 'use-constant';

import { toAsset, withHandleInfo } from '../../../adapters/assets';
import { encodeToCbor } from '../../../adapters/transactions';
import {
  displayUnit,
  getAdaHandle,
  isValidAddress,
  toUnit,
} from '../../../api/extension';
import { buildTx, signAndSubmit } from '../../../api/extension/wallet';
import { assetsToValue, minAdaRequired } from '../../../api/util';
import { ERROR } from '../../../config/config';
import { Events } from '../../../features/analytics/events';
import { useCaptureEvent } from '../../../features/analytics/hooks';
import { useCommonOutsideHandles } from '../../../features/common-outside-handles-provider';
import { useStoreActions, useStoreState } from '../../store';
import Account from '../components/account';
import AssetBadge from '../components/assetBadge';
import AssetsModal from '../components/assetsModal';
import AvatarLoader from '../components/avatarLoader';
import ConfirmModal from '../components/confirmModal';
import Copy from '../components/copy';
import { Scrollbars } from '../components/scrollbar';
import UnitDisplay from '../components/unitDisplay';

import type { UseAccount } from '../../../adapters/account';
import type { OutsideHandlesContextValue } from '../../../features/outside-handles-provider';
import type { Asset as NamiAsset, AssetInput } from '../../../types/assets';
import type { AssetsModalRef } from '../components/assetsModal';
import type { ConfirmModalRef } from '../components/confirmModal';
import type { Wallet } from '@lace/cardano';

interface Props {
  activeAddress: string;
  inMemoryWallet: Wallet.ObservableWallet;
  currentChain: Wallet.Cardano.ChainId;
  accounts: UseAccount['nonActiveAccounts'];
  activeAccount: UseAccount['activeAccount'];
  updateAccountMetadata: UseAccount['updateAccountMetadata'];
  withSignTxConfirmation: <T>(
    action: () => Promise<T>,
    password?: string,
  ) => Promise<T>;
  environmentName: OutsideHandlesContextValue['environmentName'];
}

const useIsMounted = () => {
  const isMounted = React.useRef(false);
  React.useEffect((): (() => void) => {
    isMounted.current = true;
    return () => (isMounted.current = false);
  }, []);
  return isMounted;
};

const objectToArray = obj => Object.keys(obj).map(key => obj[key]);

export const isAdaHandleEnabled = process.env.USE_ADA_HANDLE === 'true';

const Send = ({
  accounts,
  activeAccount,
  inMemoryWallet,
  activeAddress,
  currentChain,
  updateAccountMetadata,
  withSignTxConfirmation,
  environmentName,
}: Readonly<Props>) => {
  const capture = useCaptureEvent();
  const isMounted = useIsMounted();
  const { cardanoCoin, walletType, openHWFlow } = useCommonOutsideHandles();
  const [address, setAddress] = [
    useStoreState(state => state.globalModel.sendStore.address),
    useStoreActions(actions => actions.globalModel.sendStore.setAddress),
  ];
  const [value, setValue] = [
    useStoreState(state => state.globalModel.sendStore.value),
    useStoreActions(actions => actions.globalModel.sendStore.setValue),
  ];
  const [message, setMessage] = [
    useStoreState(state => state.globalModel.sendStore.message),
    useStoreActions(actions => actions.globalModel.sendStore.setMessage),
  ];
  const [txInfo, setTxInfo] = [
    useStoreState(state => state.globalModel.sendStore.txInfo),
    useStoreActions(actions => actions.globalModel.sendStore.setTxInfo),
  ];

  const [fee, setFee] = [
    useStoreState(state => state.globalModel.sendStore.fee),
    useStoreActions(actions => actions.globalModel.sendStore.setFee),
  ];
  const [tx, setTx] = [
    useStoreState(state => state.globalModel.sendStore.tx),
    useStoreActions(actions => actions.globalModel.sendStore.setTx),
  ];

  const [txUpdate, setTxUpdate] = React.useState(false);
  const triggerTxUpdate = useCallback(stateChange => {
    stateChange();
    setTxUpdate(update => !update);
  }, []);

  const assets = React.useRef<Record<string, AssetInput>>({});
  const account = React.useRef<object | null>(null);
  const resetState = useStoreActions(
    actions => actions.globalModel.sendStore.reset,
  );
  const history = useHistory();
  const toast = useToast();
  const ref = React.useRef<ConfirmModalRef>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const focus = React.useRef(false);
  const background = useColorModeValue('gray.100', 'gray.600');
  const containerBg = useColorModeValue('white', 'gray.800');

  const assetsModalRef = React.useRef<AssetsModalRef>(null);
  const protocolParameters = useObservable(inMemoryWallet.protocolParameters$);
  const utxoTotal = useObservable(inMemoryWallet?.balance.utxo.total$);
  const rawAssetsInfo = useObservable(inMemoryWallet.assetInfo$);
  const handles = useObservable(inMemoryWallet.handles$);

  const assetsInfo = useMemo(
    () => withHandleInfo(rawAssetsInfo, handles),
    [rawAssetsInfo, handles],
  );
  const rewards = useObservable(
    inMemoryWallet?.balance.rewardAccounts.rewards$,
  );

  const walletAssets = useMemo(
    () =>
      Array.from(utxoTotal?.assets || [])
        .filter(([assetId]) => assetsInfo.has(assetId))
        .map(([assetId, quantity]) =>
          toAsset(assetsInfo.get(assetId)!, quantity),
        ),
    [utxoTotal?.assets, assetsInfo],
  );

  const prepareTx = async (
    _,
    data: Readonly<{
      value: any;
      address: any;
      message: any;
      protocolParameters: Cardano.ProtocolParameters;
    }>,
  ) => {
    if (!isMounted.current) return;

    const _value = data.value;
    const _address = data.address;
    const _message = data.message;
    const protocolParameters = data.protocolParameters;
    if (!_value.ada && _value.assets.length <= 0) {
      setFee({ fee: '0' });
      setTx(null);
      return;
    }
    if (
      _address.error ||
      !_address.result ||
      (!_value.ada && _value.assets.length <= 0)
    ) {
      setFee({ fee: '0' });
      setTx(null);
      return;
    }

    setFee({ fee: '' });
    setTx(null);
    await new Promise((res, rej) =>
      setTimeout(() => {
        res(null);
      }),
    );
    try {
      const output = {
        address: _address.result,
        amount: [
          {
            unit: 'lovelace',
            quantity: toUnit(_value.ada || '10000000'),
          },
        ],
      };

      for (const asset of _value.assets) {
        if (
          !asset.input ||
          BigInt(toUnit(asset.input, asset.decimals) || '0') < 1
        ) {
          setFee({ error: 'Asset quantity not set' });
          return;
        }
        output.amount.push({
          unit: asset.unit,
          quantity: toUnit(asset.input, asset.decimals),
        });
      }

      const checkOutput = new Serialization.TransactionOutput(
        Cardano.Address.fromBytes(
          isValidAddress(
            _address.result,
            currentChain,
          ) as unknown as Wallet.HexBlob,
        ),
        assetsToValue(output.amount),
      );

      const minAda = minAdaRequired(
        checkOutput,
        BigInt(protocolParameters.coinsPerUtxoByte),
      );

      if (BigInt(minAda) <= BigInt(toUnit(_value.personalAda || '0'))) {
        const displayAda = Number.parseFloat(
          _value.personalAda.replace(/[\s,]/g, ''),
        ).toLocaleString('en-EN', { minimumFractionDigits: 6 });
        output.amount[0].quantity = toUnit(_value.personalAda || '0');
        !focus.current && setValue({ ..._value, ada: displayAda });
      } else if (_value.assets.length > 0) {
        output.amount[0].quantity = minAda;
        const minAdaDisplay = Number.parseFloat(
          displayUnit(minAda).toString().replace(/[\s,]/g, ''),
        ).toLocaleString('en-EN', { minimumFractionDigits: 6 });
        setValue({
          ..._value,
          ada: minAdaDisplay,
        });
      }

      if (BigInt(minAda) > BigInt(output.amount[0].quantity || '0')) {
        setFee({ error: 'Transaction not possible' });
        return;
      }

      const transactionOutput = new Serialization.TransactionOutput(
        Cardano.Address.fromBytes(
          isValidAddress(
            _address.result,
            currentChain,
          ) as unknown as Wallet.HexBlob,
        ),
        assetsToValue(output.amount),
      );

      const generalMetadata = new Map<
        bigint,
        Serialization.TransactionMetadatum
      >();
      const auxiliaryData = new Serialization.AuxiliaryData();

      // setting metadata for optional message (CIP-0020)
      if (_message) {
        const chunkSubstr = (str, size) => {
          const numChunks = Math.ceil(str.length / size);
          const chunks = new Array(numChunks);

          for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
            chunks[i] = str.substr(o, size);
          }

          return chunks;
        };
        const msg = { msg: chunkSubstr(_message, 64) };
        generalMetadata.set(
          BigInt('674'),
          Serialization.TransactionMetadatum.fromCore(
            ProviderUtil.jsonToMetadatum(msg),
          ),
        );
      }

      if (generalMetadata.size > 0) {
        auxiliaryData.setMetadata(
          new Serialization.GeneralTransactionMetadata(generalMetadata),
        );
      }

      const tx = await buildTx({
        output: transactionOutput,
        auxiliaryData,
        inMemoryWallet,
      });
      const inspection = await tx.inspect();
      setFee({ fee: inspection.inputSelection.fee.toString() });
      setTx(tx);
    } catch {
      setFee({ error: 'Transaction not possible' });
    }
  };

  const prepareTxDebounced = useConstant(() =>
    debouncePromise(latest(prepareTx), 300),
  );

  const init = async () => {
    if (!isMounted.current || !protocolParameters) return;
    addAssets(value.assets);

    account.current = {};

    const checkOutput = new Serialization.TransactionOutput(
      Cardano.Address.fromBech32(activeAddress),
      new Serialization.Value(BigInt(0)),
    );
    const minUtxo = await minAdaRequired(
      checkOutput,
      BigInt(protocolParameters.coinsPerUtxoByte),
    );

    setIsLoading(false);
    setTxInfo({ minUtxo });
  };

  const addAssets = useCallback(
    _assets => {
      for (const asset of _assets) {
        assets.current[asset.unit] = { ...asset };
      }
      const assetsList = objectToArray(assets.current);
      triggerTxUpdate(() => {
        setValue({ ...value, assets: assetsList });
      });
    },
    [triggerTxUpdate, setValue],
  );

  const removeAsset = useCallback(
    asset => {
      delete assets.current[asset.unit];
      const assetsList = objectToArray(assets.current);
      triggerTxUpdate(() => {
        setValue({ ...value, assets: assetsList });
      });
    },
    [assets.current, triggerTxUpdate, setValue],
  );

  React.useEffect(() => {
    if (protocolParameters) {
      if (tx !== null) setTx(null);
      if (fee.fee !== '' || fee.error) setFee({ fee: '' });
      prepareTxDebounced(0, {
        value,
        address,
        message,
        protocolParameters,
      });
    }
  }, [txUpdate, message]);

  React.useEffect(() => {
    init();
  }, [protocolParameters]);

  React.useEffect(() => {
    return () => {
      resetState();
    };
  }, []);

  const onAssetInput = useCallback(
    async (asset: Readonly<AssetInput>, val: string) => {
      if (!assets.current[asset.unit]) return;
      assets.current[asset.unit].input = val;
      const v = value;
      v.assets = objectToArray(assets.current);
      triggerTxUpdate(() => {
        setValue({ ...v, assets: v.assets });
      });
    },
    [assets.current, triggerTxUpdate, setValue],
  );

  const setMessageDebounced = useMemo(() => debounce(setMessage, 300), []);

  return (
    <>
      <Box
        height="calc(100vh - 30px)"
        display="flex"
        alignItems="center"
        flexDirection="column"
        position="relative"
        background={containerBg}
      >
        {protocolParameters && isLoading ? (
          <Box
            height="100vh"
            width="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Spinner color="teal" speed="0.5s" />
          </Box>
        ) : (
          <>
            <Account name={activeAccount.name} avatar={activeAccount.avatar} />
            <Box position="absolute" top="24" left="6">
              <IconButton
                rounded="md"
                onClick={() => {
                  history.push('/');
                }}
                variant="ghost"
                aria-label={''}
                icon={<ChevronLeftIcon boxSize="6" />}
              />
            </Box>
            <Box height="10" />
            <Text fontSize="lg" fontWeight="bold">
              Send
            </Text>
            <Box height="8" />
            <Box
              display="flex"
              alignItems="center"
              flexDirection="column"
              justifyContent="center"
              width="80%"
            >
              <AddressPopup
                recentSendToAddress={
                  activeAccount.recentSendToAddress?.[environmentName]
                }
                accounts={accounts}
                currentChain={currentChain}
                setAddress={setAddress}
                address={address}
                triggerTxUpdate={triggerTxUpdate}
                isLoading={isLoading}
                environmentName={environmentName}
              />
              {address.error && (
                <Text
                  mb={-2}
                  mt={1}
                  width="full"
                  textAlign="left"
                  color="red.300"
                >
                  {address.error}
                </Text>
              )}
              <Box height="5" />
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="center"
              >
                <InputGroup size="sm" flex={3}>
                  <InputLeftElement>
                    <Box pl={4}>
                      {isLoading ? (
                        <Spinner
                          color="teal"
                          speed="0.5s"
                          boxSize="9px"
                          size="xs"
                        />
                      ) : (
                        <Box>{cardanoCoin.symbol}</Box>
                      )}
                    </Box>
                  </InputLeftElement>
                  <NumericFormat
                    pl="10"
                    allowNegative={false}
                    thousandsGroupStyle="thousand"
                    value={value.ada}
                    decimalSeparator="."
                    displayType="input"
                    type="text"
                    thousandSeparator={true}
                    fixedDecimalScale={true}
                    decimalScale={6}
                    onInput={e => {
                      const val = e.target.value;
                      value.ada = val;
                      value.personalAda = val;
                      const v = value;
                      triggerTxUpdate(() => {
                        setValue({
                          ...v,
                        });
                      });
                    }}
                    variant="filled"
                    isDisabled={isLoading}
                    isInvalid={
                      value.ada &&
                      (BigInt(toUnit(value.ada)) < BigInt(txInfo.minUtxo) ||
                        BigInt(toUnit(value.ada)) >
                          BigInt(
                            BigInt(utxoTotal?.coins || 0) +
                              BigInt(rewards || 0) || '0',
                          ))
                    }
                    onFocus={() => (focus.current = true)}
                    placeholder="0.000000"
                    customInput={Input}
                  />
                </InputGroup>
                <Box w={4} />
                <AssetsSelector
                  addAssets={addAssets}
                  assets={walletAssets}
                  value={value}
                />
              </Stack>
              <Box height="4" />
              <Box
                width={'96%'}
                display={'flex'}
                alignItems={'center'}
                justifyContent={'center'}
              >
                <InputGroup size="sm">
                  <InputLeftElement>
                    <Icon as={MdModeEdit} />
                  </InputLeftElement>
                  <Input
                    defaultValue={message}
                    onInput={e => {
                      const msg = (e.target as HTMLInputElement).value;
                      setMessageDebounced(msg);
                    }}
                    size={'sm'}
                    variant={'flushed'}
                    placeholder="Optional message"
                    fontSize={'xs'}
                  />
                </InputGroup>
              </Box>
              <Box height="4" />
              <Scrollbars
                style={{
                  width: '100%',
                  height: '170px',
                }}
              >
                <Box
                  display="flex"
                  width="full"
                  flexWrap="wrap"
                  paddingRight="2"
                >
                  {value.assets.map(asset => (
                    <Box key={asset?.unit}>
                      <AssetBadge
                        onRemove={removeAsset}
                        onInput={onAssetInput}
                        asset={asset}
                      />
                    </Box>
                  ))}
                </Box>
              </Scrollbars>
            </Box>

            <Box
              position="absolute"
              width="full"
              bottom="3"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Button
                data-testid="sendBtn"
                isLoading={
                  !fee.fee &&
                  !fee.error &&
                  !!address.result &&
                  !address.error &&
                  !!(value.ada || value.assets.length > 0)
                }
                width={'326px'}
                height={'50px'}
                isDisabled={!tx || !address.result || !!fee.error}
                colorScheme="orange"
                onClick={() => {
                  capture(Events.SendTransactionDataReviewTransactionClick);
                  ref.current?.openModal();
                }}
              >
                {fee.error || 'Send'}
              </Button>
            </Box>
          </>
        )}
      </Box>
      <AssetsModal ref={assetsModalRef} />
      <ConfirmModal
        isPopup={true}
        openHWFlow={openHWFlow}
        walletType={walletType}
        title={'Confirm transaction'}
        info={
          <Box
            width={'full'}
            display={'flex'}
            alignItems={'center'}
            justifyContent={'center'}
            flexDirection={'column'}
          >
            <UnitDisplay
              fontSize="2xl"
              fontWeight="medium"
              hide
              quantity={toUnit(value.ada, 6)}
              decimals={6}
              symbol={'₳'}
            />
            {value.assets.length > 0 && (
              <Button
                data-testid="assetsBtn"
                mt={1}
                size={'xs'}
                onClick={() =>
                  assetsModalRef.current?.openModal({
                    userInput: true,
                    assets: value.assets.map(asset => ({
                      ...asset,
                      quantity: toUnit(asset.input, asset.decimals),
                    })),
                    background: 'red.400',
                    color: 'white',
                    title: (
                      <Box>
                        Sending{' '}
                        <Box as={'span'} color={'red.400'}>
                          {value.assets.length}
                        </Box>{' '}
                        {value.assets.length == 1 ? 'asset' : 'assets'}
                      </Box>
                    ),
                  })
                }
              >
                + {value.assets.length}{' '}
                {value.assets.length > 1 ? 'Assets' : 'Asset'}
              </Button>
            )}
            <Box h={3} />
            <Box fontSize={'sm'}>to</Box>
            <Box h={2} />
            <Box
              position={'relative'}
              background={background}
              rounded={'xl'}
              p={2}
            >
              {' '}
              <Copy label="Copied address" copy={address.result}>
                <Box
                  width="180px"
                  whiteSpace="nowrap"
                  fontWeight="normal"
                  textAlign={'center'}
                  display={'flex'}
                  alignItems={'center'}
                  justifyContent={'center'}
                  flexDirection={'column'}
                  lineHeight={'16px'}
                >
                  <MiddleEllipsis>
                    <span style={{ fontSize: '12px', cursor: 'pointer' }}>
                      {address.result}
                    </span>
                  </MiddleEllipsis>
                </Box>
              </Copy>
            </Box>
            <Box h={4} />
            <Box
              width={'full'}
              display={'flex'}
              alignItems={'center'}
              justifyContent={'center'}
              fontSize={'sm'}
            >
              <UnitDisplay quantity={fee.fee} decimals={6} symbol={'₳'} />{' '}
              <Box ml={1} fontWeight={'normal'}>
                fee
              </Box>
            </Box>
            <Box h={6} />
          </Box>
        }
        ref={ref}
        sign={async (password = '') => {
          capture(Events.SendTransactionConfirmationConfirmClick);
          try {
            await signAndSubmit({
              tx,
              password,
              withSignTxConfirmation,
              inMemoryWallet,
            });
          } catch (error) {
            console.error('Failed to sign and submit transaction', error);
            throw error;
          }
        }}
        getCbor={async () => {
          const inspection = await tx.inspect();

          return encodeToCbor({
            body: inspection.body,
            witness: inspection.witness,
            auxiliaryData: inspection.auxiliaryData,
          });
        }}
        onConfirm={async (status, error) => {
          if (status) {
            capture(Events.SendTransactionConfirmed);
            toast({
              title: 'Transaction submitted',
              status: 'success',
              duration: 5000,
            });
            if (isValidAddress(address.result, currentChain)) {
              await updateAccountMetadata({
                namiMode: {
                  recentSendToAddress: { [environmentName]: address.result },
                },
              });
            }
          } else if (error === ERROR.fullMempool) {
            toast({
              title: 'Transaction failed',
              description: 'Mempool full. Try again.',
              status: 'error',
              duration: 3000,
              isClosable: true,
            });
            ref.current?.closeModal();
            return; // don't go back to home screen. let user try to submit same tx again
          } else
            toast({
              title: 'Transaction failed',
              status: 'error',
              duration: 3000,
            });
          ref.current?.closeModal();
          setTimeout(() => {
            history.push('/');
          }, 200);
        }}
      />
    </>
  );
};

// Address Popup
const AddressPopup = ({
  accounts,
  currentChain,
  setAddress,
  address,
  triggerTxUpdate,
  isLoading,
  recentSendToAddress,
  environmentName,
}: Readonly<{
  accounts: UseAccount['nonActiveAccounts'];
  recentSendToAddress?: string;
  currentChain: Wallet.Cardano.ChainId;
  setAddress: any;
  address: { result: string; display: string; error?: string };
  triggerTxUpdate: any;
  isLoading: boolean;
  environmentName: OutsideHandlesContextValue['environmentName'];
}>) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const checkColor = useColorModeValue('teal.500', 'teal.200');
  const ref = React.useRef(false);
  const latestHandleInputToken = React.useRef(0);
  const { handleResolver } = useCommonOutsideHandles();

  const handleInput = async e => {
    const value = e.target.value;
    let addr;
    let isHandle = false;
    if (!e.target.value) {
      addr = { result: '', display: '' };
    } else if (value.startsWith('$')) {
      isHandle = true;
      addr = { display: value };
    } else if (isValidAddress(value, currentChain)) {
      addr = { result: value, display: value };
    } else {
      addr = {
        result: value,
        display: value,
        error: 'Address is invalid',
      };
    }

    if (isHandle && isAdaHandleEnabled) {
      const handle = value;

      const resolvedAddress = await getAdaHandle(
        handle.slice(1),
        handleResolver,
      );
      addr =
        handle.length > 1 &&
        resolvedAddress &&
        isValidAddress(resolvedAddress, currentChain)
          ? {
              result: resolvedAddress,
              display: handle,
            }
          : {
              result: '',
              display: handle,
              error: '$handle not found',
            };
    }

    return addr;
  };

  const handleInputDebounced = useConstant(() =>
    debouncePromise(latest(handleInput), 700),
  );

  const filteredAccounts = useMemo(
    () => accounts.filter(a => a.address?.[environmentName]),
    [accounts],
  );

  return (
    <Popover
      isOpen={(Boolean(recentSendToAddress) || accounts.length > 0) && isOpen}
      onOpen={() => {
        !isLoading && !address.result && !address.error && onOpen();
      }}
      autoFocus={false}
      onClose={async () => {
        await new Promise<void>((res, rej) =>
          setTimeout(() => {
            res();
          }),
        );
        if (ref.current) {
          ref.current = false;
          return;
        }
        onClose();
      }}
      gutter={1}
      isLazy
    >
      <PopoverTrigger>
        <InputGroup>
          <Input
            disabled={isLoading}
            variant="filled"
            autoComplete="off"
            value={address.display}
            spellCheck={false}
            onBlur={async e => {
              await new Promise<void>((res, rej) =>
                setTimeout(() => {
                  res();
                }),
              );
              if (ref.current) {
                ref.current = false;
                return;
              }
              onClose();
              setTimeout(() => {
                e.target.blur();
              });
            }}
            fontSize="xs"
            placeholder="Address or $handle"
            onInput={async e => {
              const handleInputToken = latestHandleInputToken.current + 1;
              latestHandleInputToken.current = handleInputToken;
              setAddress({ display: (e.target as HTMLInputElement).value });
              const addr = await handleInputDebounced(e);

              if (handleInputToken !== latestHandleInputToken.current) {
                return;
              }

              triggerTxUpdate(() => setAddress(addr));
              onClose();
            }}
            isInvalid={Boolean(address.error)}
          />
          {address.result && !address.error && (
            <InputRightElement>
              <CheckIcon boxSize="3" color={checkColor} />
            </InputRightElement>
          )}
        </InputGroup>
      </PopoverTrigger>
      <PopoverContent
        onClick={() => {
          ref.current = false;
        }}
        onFocus={() => {
          ref.current = true;
        }}
        _focus={{ outline: 'none' }}
      >
        <PopoverBody pr="-2">
          <Scrollbars
            style={{ width: '100%', overflowX: 'hidden' }}
            autoHeight
            autoHeightMax={240}
          >
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              marginRight="4"
            >
              {recentSendToAddress && (
                <Button
                  data-testid="recentAddress"
                  ml="2"
                  my="1"
                  variant="ghost"
                  width="full"
                  onClick={() => {
                    const address = recentSendToAddress;
                    triggerTxUpdate(() =>
                      setAddress({
                        result: address,
                        display: address,
                      }),
                    );
                    onClose();
                  }}
                >
                  <Box display="flex" flexDirection="column" width="full">
                    <Text fontWeight="bold" fontSize="13" textAlign="left">
                      Recent
                    </Text>
                    <Box h="0.5" />
                    <Box
                      fontSize="11"
                      textAlign="left"
                      whiteSpace="nowrap"
                      fontWeight="normal"
                    >
                      <MiddleEllipsis>
                        <span>{recentSendToAddress}</span>
                      </MiddleEllipsis>
                    </Box>
                  </Box>
                </Button>
              )}
              {filteredAccounts.length > 0 && (
                <>
                  {' '}
                  <Text
                    width="full"
                    mt="3"
                    mb="2"
                    fontWeight="bold"
                    fontSize="13"
                    textAlign="left"
                  >
                    Accounts
                  </Text>
                  {filteredAccounts.map(({ name, address, avatar }) => {
                    return (
                      <Button
                        key={address?.[environmentName]}
                        ml="2"
                        my="1"
                        width="full"
                        variant="ghost"
                        onClick={() => {
                          triggerTxUpdate(() =>
                            setAddress({
                              result: address?.[environmentName],
                              display: address?.[environmentName],
                            }),
                          );
                          onClose();
                        }}
                      >
                        <Box width="full" display="flex">
                          <Box ml="-1">
                            <AvatarLoader width="30px" avatar={avatar} />
                          </Box>
                          <Box ml="4" display="flex" flexDirection="column">
                            <Text
                              fontWeight="bold"
                              fontSize="13"
                              textAlign="left"
                            >
                              {name}
                            </Text>
                            <Box
                              width="220px"
                              fontSize="11"
                              textAlign="left"
                              whiteSpace="nowrap"
                              fontWeight="normal"
                            >
                              <MiddleEllipsis>
                                <span>{address?.[environmentName]}</span>
                              </MiddleEllipsis>
                            </Box>
                          </Box>
                        </Box>
                      </Button>
                    );
                  })}{' '}
                </>
              )}
            </Box>
          </Scrollbars>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

// Asset Popup
interface CustomScrollbarsProps {
  onScroll?: React.UIEventHandler;
  children?: React.ReactNode;
  forwardedRef:
    | React.ForwardedRef<unknown>
    | ((ref: RefObject<any> | null) => void);
  style?: React.CSSProperties;
}

const CustomScrollbars = ({
  onScroll,
  forwardedRef,
  style,
  children,
}: Readonly<CustomScrollbarsProps>) => {
  const refSetter = React.useCallback(scrollbarsRef => {
    if (typeof forwardedRef === 'function') {
      scrollbarsRef ? forwardedRef(scrollbarsRef.view) : forwardedRef(null);
    }
  }, []);

  return (
    <Scrollbars
      ref={refSetter}
      style={{ ...style, overflow: 'hidden', marginRight: 4 }}
      onScroll={onScroll}
    >
      {children}
    </Scrollbars>
  );
};

const CustomScrollbarsVirtualList = React.forwardRef((props, ref) => (
  <CustomScrollbars {...props} forwardedRef={ref} />
));

const AssetsSelector = ({
  assets,
  addAssets,
  value,
}: Readonly<{ assets: NamiAsset[]; addAssets: any; value: any }>) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [search, setSearch] = React.useState('');
  const select = React.useRef(false);
  const [choice, setChoice] = React.useState({});

  const filteredAssets = useMemo(() => {
    const filter1 = asset =>
      value.assets.every(asset2 => asset.unit !== asset2.unit);
    const filter2 = asset =>
      search
        ? asset.name.toLowerCase().includes(search.toLowerCase()) ||
          asset.policy.includes(search) ||
          asset.fingerprint.includes(search)
        : true;
    return assets.filter(asset => filter1(asset) && filter2(asset));
  }, [assets, value, search]);

  return (
    <Popover isLazy isOpen={isOpen} onOpen={onOpen} onClose={onClose}>
      <PopoverTrigger>
        <Button isDisabled={!assets || assets.length === 0} flex={1} size="sm">
          + Assets
        </Button>
      </PopoverTrigger>
      {isOpen && (
        <PopoverContent w="98%">
          <PopoverArrow ml="4px" />
          <PopoverHeader
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <InputGroup
              width={Object.keys(choice).length <= 0 ? '90%' : undefined}
              flex={Object.keys(choice).length > 0 ? 3 : undefined}
              size="sm"
            >
              <Input
                value={search}
                size="sm"
                variant="filled"
                placeholder="Search policy, asset, name"
                fontSize="xs"
                onInput={e => {
                  setSearch((e.target as HTMLInputElement).value);
                }}
              />
              <InputRightElement>
                <SmallCloseIcon
                  cursor="pointer"
                  onClick={() => {
                    setSearch('');
                  }}
                />
              </InputRightElement>
            </InputGroup>
            {Object.keys(choice).length > 0 && (
              <>
                <Box w="2" />
                <Box
                  width="100%"
                  flex={1}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <IconButton
                    aria-label="close button"
                    size="xs"
                    rounded="md"
                    onClick={() => {
                      setChoice({});
                    }}
                    icon={<CloseIcon />}
                  />

                  <Box w="3" />
                  <IconButton
                    aria-label="add asset button"
                    colorScheme="teal"
                    size="xs"
                    rounded="md"
                    onClick={() => {
                      onClose();
                      setTimeout(() => {
                        addAssets(assets.filter(asset => choice[asset.unit]));
                        setChoice({});
                      }, 100);
                    }}
                    icon={<CheckIcon />}
                  />
                </Box>
              </>
            )}
          </PopoverHeader>
          <PopoverBody p="-2">
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexDirection="column"
              my="1"
            >
              {assets ? (
                filteredAssets.length > 0 ? (
                  <List
                    outerElementType={CustomScrollbarsVirtualList}
                    height={200}
                    itemCount={filteredAssets.length}
                    itemSize={45}
                    width={345}
                    layout="vertical"
                  >
                    {({ index, style }) => {
                      const asset = filteredAssets[index];
                      return (
                        <Box
                          style={style}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Asset
                            asset={asset}
                            setChoice={setChoice}
                            choice={choice}
                            select={select}
                            onClose={onClose}
                            addAssets={addAssets}
                          />
                        </Box>
                      );
                    }}
                  </List>
                ) : (
                  <Box
                    width={345}
                    height={200}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    flexDirection="column"
                    opacity="0.5"
                  >
                    <Planet size={80} mood="ko" color="#61DDBC" />
                    <Box height="2" />
                    <Text fontSize={12} fontWeight="bold" color="GrayText">
                      No Assets
                    </Text>
                  </Box>
                )
              ) : (
                <Box
                  width={345}
                  height={200}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Spinner color="teal" speed="0.5s" />
                </Box>
              )}
            </Box>
          </PopoverBody>
        </PopoverContent>
      )}
    </Popover>
  );
};

const Asset = ({
  asset,
  choice,
  select,
  setChoice,
  onClose,
  addAssets,
}: Readonly<{
  asset: NamiAsset;
  choice;
  select;
  setChoice;
  onClose;
  addAssets;
}>) => {
  const hoverColor = useColorModeValue('gray.100', 'gray.600');

  return (
    <Button
      background={choice[asset.unit] && hoverColor}
      _hover={{
        bgBlendMode: false,
        bg: !choice[asset.unit] && hoverColor,
      }}
      width="96%"
      onClick={() => {
        if (select.current) {
          select.current = false;
          return;
        }
        onClose();
        addAssets([asset]);
      }}
      mr="3"
      ml="4"
      display="flex"
      alignItems="center"
      justifyContent="start"
      variant="ghost"
    >
      <Stack
        width="100%"
        fontSize="xs"
        direction="row"
        alignItems="center"
        justifyContent="start"
      >
        <Selection
          asset={asset}
          select={select}
          choice={choice}
          setChoice={setChoice}
        />

        <Box
          textAlign="left"
          width="200px"
          whiteSpace="nowrap"
          fontWeight="normal"
        >
          <Box mb="-1px">
            <MiddleEllipsis>
              <span>{asset.labeledName}</span>
            </MiddleEllipsis>
          </Box>
          <Box whiteSpace="nowrap" fontSize="xx-small" fontWeight="light">
            <MiddleEllipsis>
              <span>Policy: {asset.policy}</span>
            </MiddleEllipsis>
          </Box>
        </Box>
        <Box>
          <UnitDisplay quantity={asset.quantity} decimals={asset.decimals} />
        </Box>
      </Stack>
    </Button>
  );
};

const Selection = ({
  select,
  asset,
  choice,
  setChoice,
}: Readonly<{ select; asset: NamiAsset; choice; setChoice }>) => {
  const selectColor = useColorModeValue('orange.500', 'orange.200');
  return (
    <Box
      rounded="full"
      width="6"
      height="6"
      overflow="hidden"
      onClick={() => (select.current = true)}
    >
      {choice[asset.unit] ? (
        <Box
          width="100%"
          height="100%"
          background={selectColor}
          display="flex"
          alignItems="center"
          justifyContent="center"
          color={selectColor === 'orange.200' ? 'black' : 'white'}
          onClick={e => {
            delete choice[asset.unit];
            setChoice({ ...choice });
          }}
        >
          <CheckIcon />
        </Box>
      ) : (
        <Avatar
          onClick={e => {
            choice[asset.unit] = true;
            setChoice({ ...choice });
          }}
          userSelect="none"
          size="xs"
          name={asset.name}
        />
      )}
    </Box>
  );
};

export default Send;
