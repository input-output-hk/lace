/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable max-params */
/* eslint-disable unicorn/no-null */
import type { RefObject } from 'react';
import React from 'react';

import { metadatum, Serialization } from '@cardano-sdk/core';
import { ChevronRightIcon } from '@chakra-ui/icons';
import {
  Box,
  Stack,
  Text,
  Button,
  Image,
  Modal,
  ModalBody,
  ModalContent,
  Spinner,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react';
import { Wallet } from '@lace/cardano';
import MiddleEllipsis from 'react-middle-ellipsis';
import { firstValueFrom, map } from 'rxjs';

import { Events } from '../../../../features/analytics/events';
import { useCaptureEvent } from '../../../../features/analytics/hooks';
import { useCommonOutsideHandles } from '../../../../features/common-outside-handles-provider';
import Account from '../../components/account';
import AssetsModal from '../../components/assetsModal';
import ConfirmModal from '../../components/confirmModal';
import Copy from '../../components/copy';
import { Scrollbars } from '../../components/scrollbar';
import UnitDisplay from '../../components/unitDisplay';

import {
  getKeyHashes,
  getValueWithSdk as getValue,
  isScriptAddress,
} from './signTxUtil';

import type { TransactionValue } from './signTxUtil';
import type { UseAccount } from '../../../../adapters/account';
import type { DappConnector } from '../../../../features/dapp-outside-handles-provider';
import type { Asset as NamiAsset } from '../../../../types/assets';
import type { AssetsModalRef } from '../../components/assetsModal';
import type { Cardano } from '@cardano-sdk/core';

interface Props {
  dappConnector: DappConnector;
  account: UseAccount['activeAccount'];
  inMemoryWallet: Wallet.ObservableWallet;
}

const abs = big => {
  return big < 0 ? big * BigInt(-1) : big;
};

interface Property {
  metadata: boolean;
  certificate: boolean;
  withdrawal: boolean;
  minting: boolean;
  script: boolean;
  contract: boolean;
  datum: boolean;
}

export const SignTx = ({
  inMemoryWallet,
  dappConnector,
  account,
}: Readonly<Props>) => {
  const [request, setRequest] =
    React.useState<
      Awaited<ReturnType<typeof dappConnector.getSignTxRequest>>['request']
    >();
  const [dappInfo, setDappInfo] = React.useState<Wallet.DappInfo>();

  const capture = useCaptureEvent();
  const { cardanoCoin, walletType, openHWFlow } = useCommonOutsideHandles();
  const ref = React.useRef();
  const [collateral, setCollateral] = React.useState<Wallet.Cardano.Utxo>();
  const [fee, setFee] = React.useState('0');
  const [value, setValue] = React.useState<TransactionValue | null>(null);
  const [property, setProperty] = React.useState<Property>({
    metadata: false,
    certificate: false,
    withdrawal: false,
    minting: false,
    script: false,
    contract: false,
    datum: false,
  });

  // key kind can be payment and stake
  const [keyHashes, setKeyHashes] = React.useState<{
    key: string[];
    kind: string[];
  }>({ kind: [], key: [] });
  const [isLoading, setIsLoading] = React.useState({
    loading: true,
    error: '',
  });

  const assetsModalRef = React.useRef<AssetsModalRef>(null);
  const detailsModalRef = React.useRef<DetailsModalRef>(null);

  const getFee = (tx: Readonly<Cardano.Tx>) => {
    const fee = tx.body.fee.toString();
    setFee(fee);
  };

  const getProperties = (tx: Readonly<Cardano.Tx>) => {
    const metadata = tx.auxiliaryData?.blob;
    let metadataJson;
    if (metadata && metadata.size > 0) {
      metadataJson = {};
      for (const [key, value] of metadata.entries()) {
        try {
          metadataJson[key.toString()] = metadatum.metadatumToJson(value);
        } catch (error) {
          console.error(`error parsing tx ${tx.id} metadatum`, { error });
        }
      }
    }

    const certificate = tx.body.certificates;
    const withdrawal = tx.body.withdrawals;
    const minting = tx.body.mint;
    const script = tx.witness.scripts?.filter(
      s => s.__type === Wallet.Cardano.ScriptType.Native,
    );
    let datum = false;
    let contract: Wallet.Crypto.Hash32ByteBase16 | boolean | undefined =
      tx.body.scriptIntegrityHash;
    const outputs = tx.body.outputs;
    for (const output of outputs) {
      if (output.datum || output.datumHash) {
        datum = true;
        if (isScriptAddress(output.address)) {
          contract = true;
          break;
        }
      }
    }

    setProperty({
      metadata: metadataJson as boolean,
      certificate: !!certificate,
      withdrawal: !!withdrawal,
      minting: !!minting,
      contract: !!contract,
      script: !!script,
      datum,
    });
  };

  const checkCollateral = (
    tx: Readonly<Cardano.Tx>,
    utxos: readonly Cardano.Utxo[],
    collateral: Readonly<Wallet.Cardano.Utxo | undefined>,
  ) => {
    const collateralInputs = tx.body.collaterals;
    if (!collateralInputs) return;

    // checking all wallet utxos if used as collateral
    for (const collateralInput of collateralInputs) {
      for (const utxo of utxos) {
        const input = utxo[0];
        if (
          input.txId === collateralInput.txId &&
          input.index === collateralInput.index
        ) {
          // collateral utxo is less than 50 ADA. That's also fine.
          if (utxo[1].value.coins <= 50_000_000) return;

          if (!collateral) {
            setIsLoading(l => ({ ...l, error: 'Collateral not set' }));
            return;
          }

          if (
            collateralInput.txId !== collateral[0].txId ||
            collateralInput.index !== collateral[0].index
          ) {
            setIsLoading(l => ({ ...l, error: 'Invalid collateral used' }));
            return;
          }
        }
      }
    }
  };

  const getInfo = async () => {
    const { dappInfo, request } = await dappConnector.getSignTxRequest();
    setRequest(request);
    setDappInfo(dappInfo);

    setCollateral(
      await firstValueFrom(
        inMemoryWallet.utxo.unspendable$.pipe(
          map(collaterals => {
            if (collaterals.length === 0) return undefined;
            return collaterals[0];
          }),
        ),
      ),
    );

    const utxos = await firstValueFrom(inMemoryWallet.utxo.available$);
    const tx = Serialization.Transaction.fromCbor(request.data.tx).toCore();
    getFee(tx);
    setValue(
      await getValue(
        tx,
        utxos,
        request.data.addresses.map(a => a.address),
      ),
    );

    checkCollateral(tx, utxos, collateral);

    const keyHashes = getKeyHashes(
      tx,
      utxos,
      request.data.addresses[0].address,
    );
    if ('error' in keyHashes) {
      setIsLoading(l => ({
        ...l,
        error: keyHashes.error,
      }));
    } else {
      setKeyHashes(keyHashes);
    }
    getProperties(tx);
    setIsLoading(l => ({ ...l, loading: false }));
  };
  const background = useColorModeValue('gray.100', 'gray.700');
  const containerBg = useColorModeValue('white', 'gray.800');

  React.useEffect(() => {
    getInfo();
  }, [request]);
  return (
    <>
      {isLoading.loading ? (
        <Box
          height="100vh"
          width="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          background={containerBg}
        >
          <Spinner color="teal" speed="0.5s" />
        </Box>
      ) : (
        <Box
          minHeight="100vh"
          display="flex"
          alignItems="center"
          flexDirection="column"
          position="relative"
          background={containerBg}
        >
          <Account name={account.name} avatar={account.avatar} />
          <Box h="4" />
          <Box
            display={'flex'}
            alignItems={'center'}
            justifyContent={'left'}
            width={'full'}
          >
            <Box w="6" />
            <Box
              width={8}
              height={8}
              background={background}
              rounded={'xl'}
              display={'flex'}
              alignItems={'center'}
              justifyContent={'center'}
            >
              <Image
                draggable={false}
                width={4}
                height={4}
                src={dappInfo?.logo}
              />
            </Box>
            <Box w="3" />
            <Text fontSize={'xs'} fontWeight="bold">
              {dappInfo?.url.split('//')[1]}
            </Text>
          </Box>
          <Box h="8" />
          <Box>This app requests a signature for:</Box>
          <Box h="4" />
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexDirection="column"
            background={background}
            rounded="xl"
            width="80%"
            padding="5"
          >
            {value?.ownValue ? (
              (() => {
                const lovelace =
                  value.ownValue.find(v => v.unit === 'lovelace')?.quantity ??
                  BigInt(0);
                const assets = value.ownValue.filter(
                  v => v.unit !== 'lovelace',
                );
                return (
                  <>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="center"
                      fontSize={lovelace.toString().length < 14 ? '3xl' : '2xl'}
                      fontWeight="bold"
                      color={lovelace <= 0 ? 'teal.400' : 'red.400'}
                    >
                      <Text>{lovelace <= 0 ? '+' : '-'}</Text>
                      <UnitDisplay
                        hide
                        quantity={abs(lovelace)}
                        decimals="6"
                        symbol={cardanoCoin.symbol}
                      />
                    </Stack>
                    {assets.length > 0 && (
                      <Box
                        mt={2}
                        mb={1}
                        display={'flex'}
                        alignItems={'center'}
                        justifyContent={'center'}
                      >
                        {' '}
                        {(() => {
                          const positiveAssets = assets.filter(
                            v => v.quantity < 0,
                          ) as unknown as NamiAsset[];
                          const negativeAssets = assets.filter(
                            v => v.quantity > 0,
                          ) as unknown as NamiAsset[];
                          return (
                            <Box
                              display={'flex'}
                              alignItems={'center'}
                              justifyContent={'center'}
                            >
                              {' '}
                              {negativeAssets.length > 0 && (
                                <Button
                                  colorScheme={'red'}
                                  size={'xs'}
                                  onClick={() =>
                                    assetsModalRef.current?.openModal({
                                      background: 'red.400',
                                      color: 'white',
                                      assets: negativeAssets,
                                      title: (
                                        <Box>
                                          Sending{' '}
                                          <Box as={'span'} color={'red.400'}>
                                            {negativeAssets.length}
                                          </Box>{' '}
                                          {negativeAssets.length == 1
                                            ? 'asset'
                                            : 'assets'}
                                        </Box>
                                      ),
                                    })
                                  }
                                >
                                  - {negativeAssets.length}{' '}
                                  {negativeAssets.length > 1
                                    ? 'Assets'
                                    : 'Asset'}
                                </Button>
                              )}
                              {negativeAssets.length > 0 &&
                                positiveAssets.length > 0 && <Box w={2} />}
                              {positiveAssets.length > 0 && (
                                <Button
                                  colorScheme={'teal'}
                                  size={'xs'}
                                  onClick={() =>
                                    assetsModalRef.current?.openModal({
                                      background: 'teal.400',
                                      color: 'white',
                                      assets: positiveAssets,
                                      title: (
                                        <Box>
                                          Receiving{' '}
                                          <Box as={'span'} color={'teal.400'}>
                                            {positiveAssets.length}
                                          </Box>{' '}
                                          {positiveAssets.length == 1
                                            ? 'asset'
                                            : 'assets'}
                                        </Box>
                                      ),
                                    })
                                  }
                                >
                                  + {positiveAssets.length}{' '}
                                  {positiveAssets.length > 1
                                    ? 'Assets'
                                    : 'Asset'}
                                </Button>
                              )}
                            </Box>
                          );
                        })()}
                      </Box>
                    )}
                    <Box h={3} />
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="center"
                      fontSize="sm"
                    >
                      <UnitDisplay
                        quantity={fee}
                        decimals="6"
                        symbol={cardanoCoin.symbol}
                      />
                      <Text fontWeight="bold">fee</Text>
                    </Stack>
                  </>
                );
              })()
            ) : (
              <Text fontSize="2xl" fontWeight="bold">
                ...
              </Text>
            )}
          </Box>
          <Box h={4} />
          <Button
            rounded={'xl'}
            size={'xs'}
            rightIcon={<ChevronRightIcon />}
            onClick={() => detailsModalRef.current?.openModal()}
          >
            Details
          </Button>
          <Box
            position="absolute"
            width="full"
            bottom="3"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexDirection={'column'}
          >
            {isLoading.error && (
              <>
                <Box py={2} px={4} rounded={'full'} background={background}>
                  <Text fontSize="xs" color={'red.300'}>
                    {isLoading.error}
                  </Text>
                </Box>
                <Box h={6} />
              </>
            )}

            <Box
              display={'flex'}
              alignItems={'center'}
              justifyContent={'center'}
              width={'full'}
            >
              <Button
                height={'50px'}
                width={'180px'}
                onClick={async () => {
                  await capture(Events.DappConnectorDappTxCancelClick);
                  await request?.reject(() => {
                    window.close();
                  });
                }}
              >
                Cancel
              </Button>
              <Box w={3} />
              <Button
                height={'50px'}
                width={'180px'}
                isDisabled={isLoading.loading || !!isLoading.error}
                colorScheme="teal"
                onClick={() => {
                  capture(Events.DappConnectorDappTxSignClick);
                  (ref.current as any)?.openModal(account.index);
                }}
              >
                Sign
              </Button>
            </Box>
          </Box>
        </Box>
      )}
      <AssetsModal ref={assetsModalRef} />
      <DetailsModal
        ref={detailsModalRef}
        externalValue={value?.externalValue ?? {}}
        assetsModalRef={assetsModalRef}
        property={property}
        keyHashes={keyHashes}
        tx={request?.data.tx}
      />
      <ConfirmModal
        ref={ref}
        openHWFlow={openHWFlow}
        walletType={walletType}
        onCloseBtn={() => {
          capture(Events.DappConnectorDappTxCancelClick);
        }}
        sign={async password => {
          try {
            await request?.sign(password ?? '');
          } catch (error) {
            setIsLoading(l => ({ ...l, error: `Failed to sign. ${error}` }));
          }
        }}
        onConfirm={async status => {
          if (status) {
            await capture(Events.DappConnectorDappTxConfirmClick);
          }

          const channelCloseDelay = 100;
          setTimeout(() => {
            window.close();
          }, channelCloseDelay);
        }}
      />
    </>
  );
};

export interface DetailsModalRef {
  openModal: () => void;
}

interface DetailsModalComponentProp {
  externalValue: TransactionValue['externalValue'];
  assetsModalRef: RefObject<AssetsModalRef>;
  property: Property;
  keyHashes: {
    key: string[];
    kind: string[];
  };
  tx: Serialization.TxCBOR | undefined;
}

const DetailsModalComponent = (
  {
    externalValue,
    property,
    keyHashes,
    tx,
    assetsModalRef,
  }: Readonly<DetailsModalComponentProp>,
  ref,
) => {
  const { cardanoCoin } = useCommonOutsideHandles();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const background = useColorModeValue('white', 'gray.800');
  const innerBackground = useColorModeValue('gray.100', 'gray.700');

  React.useImperativeHandle(ref, () => ({
    openModal: () => {
      onOpen();
    },
  }));
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <ModalContent
        m={0}
        rounded="none"
        overflow={'hidden'}
        background={background}
      >
        <ModalBody p={0}>
          <Scrollbars style={{ width: '100%', height: '88vh' }}>
            <Box
              width={'full'}
              display={'flex'}
              alignItems={'center'}
              justifyContent={'center'}
              flexDirection={'column'}
            >
              <Box h={8} />
              <Box
                fontSize={'xl'}
                fontWeight={'bold'}
                maxWidth={'240px'}
                textAlign={'center'}
              >
                Details
              </Box>
              <Box h={6} />
              <Box
                width={'full'}
                px={8}
                display={'flex'}
                alignItems={'center'}
                justifyContent={'center'}
                flexDirection={'column'}
              >
                {' '}
                {Object.keys(externalValue).length > 0 && (
                  <Box width={'full'}>
                    <Text fontSize="md" fontWeight={'bold'}>
                      Recipients
                    </Text>
                    <Box height="4" />
                    {Object.keys(externalValue).map((address, index) => {
                      const lovelace = externalValue?.[address]?.value?.find(
                        v => v.unit === 'lovelace',
                      )?.quantity;
                      const assets = externalValue[address].value.filter(
                        v => v.unit !== 'lovelace',
                      ) as unknown as NamiAsset[];
                      return (
                        <Box key={index} mb="6">
                          <Stack direction="row" alignItems="center">
                            <Box
                              position={'relative'}
                              background={innerBackground}
                              rounded={'xl'}
                              p={2}
                            >
                              <Copy label="Copied address" copy={address}>
                                <Box
                                  width="160px"
                                  whiteSpace="nowrap"
                                  fontWeight="normal"
                                  textAlign={'center'}
                                  display={'flex'}
                                  alignItems={'center'}
                                  justifyContent={'center'}
                                  flexDirection={'column'}
                                >
                                  <MiddleEllipsis>
                                    <span style={{ cursor: 'pointer' }}>
                                      {address}
                                    </span>
                                  </MiddleEllipsis>
                                </Box>
                              </Copy>
                              {externalValue[address].script && (
                                <Box
                                  position={'absolute'}
                                  bottom={-2}
                                  left={4}
                                  background={innerBackground}
                                  mt={1}
                                  rounded="full"
                                  px={1}
                                  fontSize={'xs'}
                                  color={'orange'}
                                  fontWeight={'medium'}
                                >
                                  {externalValue[address].datumHash ? (
                                    <Copy
                                      label="Copied datum hash"
                                      copy={
                                        externalValue[address].datumHash ?? ''
                                      }
                                    >
                                      Contract
                                    </Copy>
                                  ) : (
                                    'Script'
                                  )}
                                </Box>
                              )}
                            </Box>
                            <Box
                              textAlign="center"
                              width={'160px'}
                              display={'flex'}
                              alignItems={'center'}
                              justifyContent={'center'}
                              flexDirection={'column'}
                            >
                              <UnitDisplay
                                hide
                                fontSize={'sm'}
                                fontWeight="bold"
                                quantity={lovelace}
                                decimals="6"
                                symbol={cardanoCoin.symbol}
                              />
                              {assets.length > 0 && (
                                <Button
                                  mt={1}
                                  size={'xs'}
                                  onClick={() =>
                                    assetsModalRef.current?.openModal({
                                      assets,
                                      title: (
                                        <Box>
                                          Address receiving{' '}
                                          <Box as={'span'}>{assets.length}</Box>{' '}
                                          {assets.length == 1
                                            ? 'asset'
                                            : 'assets'}
                                        </Box>
                                      ),
                                    })
                                  }
                                >
                                  + {assets.length}{' '}
                                  {assets.length > 1 ? 'Assets' : 'Asset'}
                                </Button>
                              )}
                            </Box>
                          </Stack>
                        </Box>
                      );
                    })}
                    <Box h={4} />
                  </Box>
                )}
                {property.metadata && (
                  <>
                    <Text width={'full'} fontSize="md" fontWeight={'bold'}>
                      Metadata
                    </Text>
                    <Box height="4" />
                    <Box
                      padding="2.5"
                      rounded={'xl'}
                      width={'full'}
                      height={'200px'}
                      background={innerBackground}
                    >
                      <Scrollbars autoHide>
                        <pre>
                          <code>
                            {JSON.stringify(property.metadata, null, 2)}
                          </code>
                        </pre>
                      </Scrollbars>
                    </Box>
                    <Box h={10} />
                  </>
                )}
                <Box fontSize="md" fontWeight={'bold'} width={'full'}>
                  Signing keys
                </Box>
                <Box height="4" />
                <Box width={'full'} display={'flex'}>
                  {keyHashes.kind.map((keyHash, index) => (
                    <Box
                      mr={2}
                      py={1}
                      px={2}
                      background={innerBackground}
                      rounded={'full'}
                      key={index}
                    >
                      <Box
                        as={'b'}
                        color={keyHash == 'payment' ? 'teal.400' : 'orange'}
                      >
                        {keyHash}
                      </Box>
                    </Box>
                  ))}
                </Box>
                <Box h={10} />
                {Object.keys(property).some(key => property[key]) && (
                  <>
                    <Box fontSize="md" fontWeight={'bold'} width={'full'}>
                      Tags
                    </Box>
                    <Box height="4" />
                    <Box width={'full'} display={'flex'} flexWrap={'wrap'}>
                      {Object.keys(property)
                        .filter(p => property[p])
                        .map((p, index) => (
                          <Box
                            mb={2}
                            mr={2}
                            py={1}
                            px={2}
                            background={innerBackground}
                            rounded={'full'}
                            key={index}
                          >
                            <Box as={'b'}>
                              {p == 'minting' && 'Minting'}
                              {p == 'certificate' && 'Certificate'}
                              {p == 'withdrawal' && 'Withdrawal'}
                              {p == 'metadata' && 'Metadata'}
                              {p == 'contract' && 'Contract'}
                              {p == 'script' && 'Script'}
                              {p == 'datum' && 'Datum'}
                            </Box>
                          </Box>
                        ))}
                    </Box>
                    <Box h={10} />
                  </>
                )}
                <Box h={5} />
                <Text width={'full'} fontSize="md" fontWeight={'bold'}>
                  Raw transaction
                </Text>
                <Box height="4" />
                <Box
                  padding="2.5"
                  rounded={'xl'}
                  width={'full'}
                  height={'200px'}
                  background={innerBackground}
                >
                  <Scrollbars autoHide>{tx}</Scrollbars>
                </Box>
                <Box h={10} />
              </Box>
              <Box
                position={'fixed'}
                bottom={0}
                width={'full'}
                display={'flex'}
                alignItems={'center'}
                justifyContent={'center'}
              >
                <Box
                  width={'full'}
                  height={'12vh'}
                  background={background}
                  display={'flex'}
                  alignItems={'center'}
                  justifyContent={'center'}
                >
                  <Button onClick={onClose} width={'180px'}>
                    Back
                  </Button>
                </Box>
              </Box>
            </Box>
          </Scrollbars>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

DetailsModalComponent.displayName = 'DetailsModal';

const DetailsModal = React.forwardRef(DetailsModalComponent);

DetailsModal.displayName = 'DetailsModal';
