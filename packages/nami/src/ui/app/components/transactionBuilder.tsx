import React from 'react';

import { CheckIcon, WarningIcon } from '@chakra-ui/icons';
import {
  Box,
  Link,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Button,
  useToast,
  Icon,
  UnorderedList,
  ListItem,
  InputGroup,
  InputRightElement,
  Input,
  Tooltip,
} from '@chakra-ui/react';
import { Wallet } from '@lace/cardano';
import { FaRegFileCode } from 'react-icons/fa';
import { GoStop } from 'react-icons/go';

import { useCollateral } from '../../../adapters/collateral';
import { useDelegation } from '../../../adapters/delegation';
import { ERROR } from '../../../config/config';
import { Events } from '../../../features/analytics/events';
import { useCaptureEvent } from '../../../features/analytics/hooks';
import { useOutsideHandles } from '../../../features/outside-handles-provider/useOutsideHandles';

import ConfirmModal from './confirmModal';
import UnitDisplay from './unitDisplay';

type States = 'DONE' | 'EDITING' | 'ERROR' | 'LOADING';
const PoolStates: Record<States, States> = {
  LOADING: 'LOADING',
  ERROR: 'ERROR',
  EDITING: 'EDITING',
  DONE: 'DONE',
};

interface PoolDisplayValue {
  ticker: string;
  name: string;
  id: string;
  error?: string;
  state: States;
  showTooltip: boolean;
}

const poolDefaultValue: PoolDisplayValue = {
  ticker: '',
  name: '',
  id: '',
  error: '',
  state: PoolStates.EDITING,
  showTooltip: false,
};

const poolRightElementStyle = (pool: Readonly<PoolDisplayValue>) => {
  if (pool.state === PoolStates.DONE || pool.state === PoolStates.ERROR) {
    return {
      width: 'auto',
      h: 'fit-content',
      top: '8px',
      right: '8px',
    };
  }

  return {
    width: '4.5rem',
    h: 'fit-content',
    top: '4px',
  };
};

const poolHasTicker = (pool: Readonly<PoolDisplayValue>): boolean => {
  return pool.state === PoolStates.DONE && Boolean(pool.ticker);
};

const poolTooltipMessage = (
  pool: Readonly<PoolDisplayValue>,
): string | undefined => {
  if (pool.state !== PoolStates.DONE) {
    return undefined;
  }

  const ticker = pool.ticker ? pool.ticker : '-';
  const name = pool.name ? pool.name : '-';

  return `${ticker} / ${name}`;
};

const TransactionBuilder = React.forwardRef<unknown, undefined>(
  (undefined, ref) => {
    const capture = useCaptureEvent();
    const {
      isInitializingCollateral,
      initializeCollateralTx: initializeCollateral,
      collateralFee,
      inMemoryWallet,
      cardanoCoin,
      buildDelegation,
      setSelectedStakePool,
      delegationTxFee,
      isBuildingTx,
      stakingError,
      passwordUtil: { setPassword },
      signAndSubmitTransaction,
      getStakePoolInfo,
      submitCollateralTx,
      withSignTxConfirmation,
      resetDelegationState,
      hasNoFunds,
      openExternalLink
    } = useOutsideHandles();
    const { initDelegation, stakeRegistration } = useDelegation({
      inMemoryWallet,
      buildDelegation,
      setSelectedStakePool,
    });
    const { hasCollateral, reclaimCollateral, submitCollateral } =
      useCollateral({
        inMemoryWallet,
        submitCollateralTx,
        withSignTxConfirmation,
      });
    const toast = useToast();
    const {
      isOpen: isOpenCol,
      onOpen: onOpenCol,
      onClose: onCloseCol,
    } = useDisclosure();
    const [isLoading, setIsLoading] = React.useState(false);
    const [data, setData] = React.useState<{
      error?: string;
      pool: PoolDisplayValue;
    }>({
      error: '',
      pool: { ...poolDefaultValue },
    });
    const delegationRef = React.useRef();
    const undelegateRef = React.useRef();
    const collateralRef = React.useRef();

    const prepareDelegationTx = async () => {
      if (data.pool.id === '') return;

      setData(d => ({
        ...d,
        pool: {
          ...d.pool,
          state: PoolStates.LOADING,
        },
      }));

      try {
        let poolId;
        try {
          poolId = Wallet.Cardano.PoolId(data.pool.id);
        } catch {
          throw new Error('Stake pool not found');
        }

        const [pool] = await getStakePoolInfo(poolId).catch(() => {
          throw new Error('Stake pool not found');
        });

        if (!pool) throw new Error('Stake pool not found');

        await initDelegation(pool).catch(() => {
          throw new Error(
            'Transaction not possible (maybe insufficient balance)',
          );
        });
        setData(d => ({
          ...d,
          pool: {
            ticker: pool.metadata?.ticker!,
            name: pool.metadata?.name!,
            id: pool.id.toString(),
            state: PoolStates.DONE,
            showTooltip: false,
          },
        }));
      } catch (error_) {
        console.log(error_);
        setData(d => ({
          ...d,
          pool: {
            ...d.pool,
            error: error_.message,
            state: PoolStates.ERROR,
          },
        }));
      }
    };

    React.useImperativeHandle(ref, () => ({
      initDelegation: async () => {
        delegationRef.current.openModal();
        if (hasNoFunds) {
          setData(d => ({
            ...d,
            error: 'Transaction not possible (maybe insufficient balance)',
          }));
        }
      },
      initUndelegate: async () => {
        undelegateRef.current.openModal();
        try {
          await initDelegation();
        } catch {
          console.error(error);
          setData(d => ({
            ...d,
            error: 'Transaction not possible (maybe account balance too low)',
          }));
        }
      },
      initCollateral: async () => {
        if (hasCollateral) {
          onOpenCol();
          return;
        }
        collateralRef.current.openModal();

        try {
          await initializeCollateral();
        } catch {
          setData(d => ({
            ...d,
            error: 'Transaction not possible (maybe insufficient balance)',
          }));
        }
      },
    }));

    const error = data.error || data.pool.error;

    return (
      <>
        <ConfirmModal
          onCloseBtn={() => {
            setData({ pool: { ...poolDefaultValue } });
            resetDelegationState();
          }}
          setPassword={setPassword}
          ready={!isBuildingTx && data.pool.state === PoolStates.DONE}
          title="Delegate your funds"
          sign={async () => {
            try {
              await signAndSubmitTransaction();
            } catch (error) {
              console.error(error);
            }
          }}
          onConfirm={status => {
            if (status === true) {
              capture(Events.StakingConfirmClick);
              toast({
                title: 'Delegation submitted',
                status: 'success',
                duration: 4000,
              });
            } else {
              toast({
                title: 'Transaction failed',
                description: stakingError,
                status: 'error',
                duration: 3000,
              });
            }
            delegationRef.current.closeModal();
          }}
          info={
            <Box
              width="100%"
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexDirection="column"
            >
              <Text fontSize="sm">
                Enter the Stake Pool ID to delegate your funds and start
                receiving rewards. Alternatively, head to{' '}
                <Link
                  fontWeight="semibold"
                  onClick={() => openExternalLink('https://pool.pm')}
                >
                  https://pool.pm
                </Link>
                , connect your Nami wallet and delegate to a stake pool of your
                choice
              </Text>
              <Box h="6" />
              <Tooltip
                label={poolTooltipMessage(data.pool)}
                placement="top"
                isOpen={data.pool.showTooltip}
              >
                <InputGroup size="md">
                  <Input
                    variant="filled"
                    h={8}
                    pr={poolHasTicker(data.pool) ? '2rem' : '4.5rem'}
                    pl={'0.5rem'}
                    type="text"
                    fontSize="14px"
                    color={
                      data.pool.state === PoolStates.DONE
                        ? '#A3AEBE'
                        : undefined
                    }
                    value={data.pool.id}
                    onChange={e => {
                      setData(s => ({
                        ...s,
                        pool: {
                          ...s.pool,
                          id: e.target.value,
                          state: PoolStates.EDITING,
                        },
                      }));
                    }}
                    placeholder="Enter Pool ID"
                    onKeyDown={async e => {
                      if (e.key == 'Enter') await prepareDelegationTx();
                    }}
                    onMouseEnter={() => {
                      setData(s => ({
                        ...s,
                        pool: {
                          ...s.pool,
                          showTooltip: s.pool.state === PoolStates.DONE,
                        },
                      }));
                    }}
                    onMouseLeave={() => {
                      setData(s => ({
                        ...s,
                        pool: {
                          ...s.pool,
                          showTooltip: false,
                        },
                      }));
                    }}
                  />
                  <InputRightElement {...poolRightElementStyle(data.pool)}>
                    {data.pool.state === PoolStates.EDITING && (
                      <Button
                        h={6}
                        size="sm"
                        colorScheme="teal"
                        disabled={data.pool.id === '' || data.pool.isLoading}
                        isLoading={data.pool.isLoading}
                        onClick={async () => {
                          await prepareDelegationTx();
                        }}
                      >
                        Verify
                      </Button>
                    )}
                    {data.pool.state === PoolStates.DONE && (
                      <CheckIcon color="teal.500" />
                    )}
                    {data.pool.state === PoolStates.ERROR && (
                      <WarningIcon color="red.300" />
                    )}
                  </InputRightElement>
                </InputGroup>
              </Tooltip>
              {error ? (
                <Box textAlign="center" mb="4" color="red.300" mt="4">
                  {error}
                </Box>
              ) : (
                <Box fontSize="sm">
                  {stakeRegistration && (
                    <Box
                      mt="1"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text fontWeight="bold">+ Stake Registration:</Text>
                      <Box w="1" />
                      <UnitDisplay
                        hide
                        quantity={stakeRegistration}
                        decimals={6}
                        symbol={cardanoCoin.symbol}
                      />
                    </Box>
                  )}
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text fontWeight="bold">+ Fee:</Text>
                    <Box w="1" />
                    <UnitDisplay
                      quantity={delegationTxFee}
                      decimals={6}
                      symbol={cardanoCoin.symbol}
                    />
                  </Box>
                  <Box h="4" />
                </Box>
              )}
            </Box>
          }
          ref={delegationRef}
        />
        <ConfirmModal
          onCloseBtn={() => {
            setData({ pool: { ...poolDefaultValue } });
            resetDelegationState();
          }}
          setPassword={setPassword}
          ready={!isBuildingTx}
          title="Stake deregistration"
          sign={async () => {
            try {
              await signAndSubmitTransaction();
            } catch (error) {
              console.log(error);
            }
          }}
          onConfirm={status => {
            if (status === true) {
              capture(Events.StakingUnstakeConfirmClick);
              toast({
                title: 'Deregistration submitted',
                status: 'success',
                duration: 4000,
              });
            } else {
              toast({
                title: 'Transaction failed',
                description: stakingError,
                status: 'error',
                duration: 3000,
              });
            }
          }}
          info={
            <Box
              width="100%"
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexDirection="column"
              fontSize={12}
            >
              <Icon as={GoStop} w={50} h={50} color="red.500" />
              <Box h="4" />
              <Text fontSize="sm">
                Going forward with deregistration will have the following
                effects:
              </Text>
              <UnorderedList mt="10px">
                <ListItem>You will no longer receive rewards.</ListItem>
                <ListItem>
                  Rewards from the 2 previous epoch will be lost.
                </ListItem>
                <ListItem>Full reward balance will be withdrawn.</ListItem>
                <ListItem>The 2 ADA deposit will be refunded.</ListItem>
                <ListItem>
                  You will have to re-register and wait 20 days to receive
                  rewards again.
                </ListItem>
              </UnorderedList>
              <Box h="6" />
              {data.error ? (
                <Box textAlign="center" mb="4" color="red.300">
                  {data.error}
                </Box>
              ) : (
                <Box fontSize="sm">
                  <Box
                    mt="1"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text fontWeight="bold">+ Stake Deregistration</Text>
                  </Box>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text fontWeight="bold">+ Fee:</Text>
                    <Box w="1" />
                    <UnitDisplay
                      quantity={delegationTxFee}
                      decimals={6}
                      symbol={cardanoCoin.symbol}
                    />
                  </Box>
                  <Box h="4" />
                </Box>
              )}
            </Box>
          }
          ref={undelegateRef}
        />
        <ConfirmModal
          ready={!isInitializingCollateral}
          title={
            <Box display="flex" alignItems="center">
              <Icon as={FaRegFileCode} mr="2" /> <Box>Collateral</Box>
            </Box>
          }
          sign={async password => {
            await submitCollateral(password);
          }}
          onCloseBtn={() => {
            capture(Events.SettingsCollateralXClick);
          }}
          onConfirm={(status, signedTx) => {
            if (status === true) {
              capture(Events.SettingsCollateralConfirmClick);
              toast({
                title: 'Collateral added',
                status: 'success',
                duration: 4000,
              });
            } else if (signedTx === ERROR.fullMempool) {
              toast({
                title: 'Transaction failed',
                description: 'Mempool full. Try again.',
                status: 'error',
                duration: 3000,
              });
            } else
              toast({
                title: 'Transaction failed',
                status: 'error',
                duration: 3000,
              });
            collateralRef.current.closeModal();
            capture(Events.SettingsCollateralXClick);
          }}
          info={
            <Box
              width="100%"
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexDirection="column"
            >
              <Text fontSize="sm">
                Add collateral in order to interact with smart contracts on
                Cardano:
                <Box mt="3">The recommended collateral amount is</Box>
                <Box mb="3" width="full" textAlign="center">
                  <b style={{ fontSize: 16 }}>5 {cardanoCoin.symbol}</b>
                </Box>{' '}
                The amount is separated from your account balance, you can
                choose to return it to your balance at any time.
                <br />
                <Link
                  fontWeight="semibold"
                  onClick={() => openExternalLink('https://namiwallet.io')}
                >
                  Read more
                </Link>
              </Text>
              <Box h="6" />
              {data.error ? (
                <Box textAlign="center" mb="4" color="red.300">
                  {data.error}
                </Box>
              ) : (
                <Box fontSize="sm">
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text fontWeight="bold">+ Fee:</Text>
                    <Box w="1" />
                    <UnitDisplay
                      quantity={collateralFee}
                      decimals={6}
                      symbol={cardanoCoin.symbol}
                    />
                  </Box>
                  <Box h="4" />
                </Box>
              )}
            </Box>
          }
          ref={collateralRef}
        />

        <Modal
          size="xs"
          isCentered
          isOpen={isOpenCol}
          onClose={() => {
            capture(Events.SettingsCollateralXClick);
            onCloseCol();
          }}
        >
          <ModalOverlay />
          <ModalContent>
            <ModalHeader fontSize="md">
              {' '}
              <Box display="flex" alignItems="center">
                <Icon as={FaRegFileCode} mr="2" /> <Box>Collateral</Box>
              </Box>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Text fontSize="sm">
                Your collateral amount is{' '}
                <b style={{ fontSize: 16 }}>5 {cardanoCoin.symbol}</b>.<br />
                <br /> When removing the collateral amount, it is returned to
                the account balance, but disables interactions with smart
                contracts.
              </Text>
              <Box h="6" />
              <Box h="3" />
              <Box
                width="100%"
                display="flex"
                alignItems="center"
                justifyContent="center"
                flexDirection="column"
              >
                <Button
                  isDisabled={isLoading}
                  isLoading={isLoading}
                  onClick={async () => {
                    setIsLoading(true);
                    await reclaimCollateral();
                    capture(Events.SettingsCollateralReclaimCollateralClick);
                    toast({
                      title: 'Collateral removed',
                      status: 'success',
                      duration: 4000,
                    });
                    onCloseCol();
                    capture(Events.SettingsCollateralXClick);
                    setIsLoading(false);
                  }}
                >
                  Remove
                </Button>

                <Box h="4" />
              </Box>
            </ModalBody>
          </ModalContent>
        </Modal>
      </>
    );
  },
);

export default TransactionBuilder;
