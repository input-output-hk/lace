/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable react/no-multi-comp */
import type { RefObject } from 'react';
import React, { useCallback, useMemo } from 'react';

import { WalletType } from '@cardano-sdk/web-extension';
import {
  SettingsIcon,
  AddIcon,
  DeleteIcon,
  CopyIcon,
  ChevronDownIcon,
  InfoOutlineIcon,
} from '@chakra-ui/icons';
import {
  Button,
  Box,
  Spacer,
  Text,
  Icon,
  Image,
  Input,
  InputGroup,
  Tooltip,
  Menu,
  MenuButton,
  MenuDivider,
  MenuGroup,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  useColorModeValue,
  Flex,
} from '@chakra-ui/react';
import { BiWallet } from 'react-icons/bi';
import {
  BsArrowDownRight,
  BsArrowUpRight,
  BsClockHistory,
} from 'react-icons/bs';
import { FaGamepad, FaRegFileCode } from 'react-icons/fa';
import { GenIcon } from 'react-icons/lib';
import { useHistory } from 'react-router-dom';

import { getNextAccountIndex } from '../../../adapters/account';
import { useDelegation } from '../../../adapters/delegation';
import { displayUnit } from '../../../api/extension';
import { currencyToSymbol } from '../../../api/util';
// Assets
import Logo from '../../../assets/img/logoWhite.svg';
import { TAB } from '../../../config/config';
import { Events } from '../../../features/analytics/events';
import { useCaptureEvent } from '../../../features/analytics/hooks';
import { useCommonOutsideHandles } from '../../../features/common-outside-handles-provider';
import { useOutsideHandles } from '../../../features/outside-handles-provider';
import About from '../components/about';
import AssetsViewer from '../components/assetsViewer';
import AvatarLoader from '../components/avatarLoader';
import CollectiblesViewer from '../components/collectiblesViewer';
import Copy from '../components/copy';
import HistoryViewer from '../components/historyViewer';
import QrCode from '../components/qrCode';
import { Scrollbars } from '../components/scrollbar';
import TransactionBuilder from '../components/transactionBuilder';
import UnitDisplay from '../components/unitDisplay';
import UserInfo from '../components/userInfo';

import type { Account, UseAccount } from '../../../adapters/account';
import type { CurrencyCode } from '../../../adapters/currency';
import type { CommonOutsideHandlesContextValue } from '../../../features/common-outside-handles-provider';
import type { OutsideHandlesContextValue } from '../../../features/outside-handles-provider';
import type { CardanoAsset, Asset as NamiAsset } from '../../../types/assets';
import type { AboutRef } from '../components/about';
import type { TransactionBuilderRef } from '../components/transactionBuilder';
import { NamiPassword } from '../components/namiPassword';

export type Props = Pick<
  CommonOutsideHandlesContextValue,
  'cardanoCoin' | 'openHWFlow'
> & {
  activeAddress: string;
  removeAccount: UseAccount['removeAccount'];
  removeWallet: UseAccount['removeWallet'];
  activateAccount: UseAccount['activateAccount'];
  addAccount: UseAccount['addAccount'];
  currency: CurrencyCode;
  activeAccount: UseAccount['activeAccount'];
  accounts: UseAccount['allAccounts'];
  balance: bigint;
  fiatPrice: number;
  lockedCoins: bigint;
  unspendableCoins: bigint;
  assets: (CardanoAsset | NamiAsset)[];
  nfts: NamiAsset[];
  setAvatar: (image: string) => void;
  environmentName: OutsideHandlesContextValue['environmentName'];
};

// extracted from `react-icons/gi` as react-icons does not support tree-shaking
// and the whole library is imported and exceeds Mozilla's 4MB file limit
const GiUsbKey = () =>
  GenIcon({
    tag: 'svg',
    attr: { viewBox: '0 0 512 512' },
    child: [
      {
        tag: 'path',
        attr: {
          d: 'M394.8 30.88l-65 65.03 86.3 86.29 65.1-65-86.4-86.32zm-6.3 36.04l17 17-12.8 12.72-17-17 12.8-12.72zm-82.8 30.4l-11.3 11.28 109 108.9 11.3-11.2-109-108.98zM263.3 103L23.4 342.9v60.5l85.2 85.2h60.5l240-239.9L263.3 103zm164.9 3.6l16.9 17-12.8 12.6-16.9-17 12.8-12.6z',
        },
        child: [],
      },
    ],
  })({});

// extracted from `react-icons/gi` as react-icons does not support tree-shaking
// and the whole library is imported and exceeds Mozilla's 4MB file limit
const GiTwoCoins = () =>
  GenIcon({
    tag: 'svg',
    attr: { viewBox: '0 0 512 512' },
    child: [
      {
        tag: 'path',
        attr: {
          d: 'M264.4 95.01c-35.6-.06-80.2 11.19-124.2 34.09C96.27 152 61.45 182 41.01 211.3c-20.45 29.2-25.98 56.4-15.92 75.8 10.07 19.3 35.53 30.4 71.22 30.4 35.69.1 80.29-11.2 124.19-34 44-22.9 78.8-53 99.2-82.2 20.5-29.2 25.9-56.4 15.9-75.8-10.1-19.3-35.5-30.49-71.2-30.49zm91.9 70.29c-3.5 15.3-11.1 31-21.8 46.3-22.6 32.3-59.5 63.8-105.7 87.8-46.2 24.1-93.1 36.2-132.5 36.2-18.6 0-35.84-2.8-50.37-8.7l10.59 20.4c10.08 19.4 35.47 30.5 71.18 30.5 35.7 0 80.3-11.2 124.2-34.1 44-22.8 78.8-52.9 99.2-82.2 20.4-29.2 26-56.4 15.9-75.7zm28.8 16.8c11.2 26.7 2.2 59.2-19.2 89.7-18.9 27.1-47.8 53.4-83.6 75.4 11.1 1.2 22.7 1.8 34.5 1.8 49.5 0 94.3-10.6 125.9-27.1 31.7-16.5 49.1-38.1 49.1-59.9 0-21.8-17.4-43.4-49.1-59.9-16.1-8.4-35.7-15.3-57.6-20zm106.7 124.8c-10.2 11.9-24.2 22.4-40.7 31-35 18.2-82.2 29.1-134.3 29.1-21.2 0-41.6-1.8-60.7-5.2-23.2 11.7-46.5 20.4-68.9 26.1 1.2.7 2.4 1.3 3.7 2 31.6 16.5 76.4 27.1 125.9 27.1s94.3-10.6 125.9-27.1c31.7-16.5 49.1-38.1 49.1-59.9z',
        },
        child: [],
      },
    ],
  })({});

const Wallet = ({
  activeAddress,
  currency,
  activeAccount,
  accounts,
  balance,
  fiatPrice,
  lockedCoins,
  unspendableCoins,
  cardanoCoin,
  addAccount,
  activateAccount,
  removeAccount,
  removeWallet,
  assets,
  nfts,
  setAvatar,
  openHWFlow,
  environmentName,
}: Readonly<Props>) => {
  const capture = useCaptureEvent();
  const history = useHistory();
  const avatarBg = useColorModeValue('white', 'gray.700');
  const panelBg = useColorModeValue('#349EA3', 'gray.800');
  const containerBg = useColorModeValue('white', 'gray.800');
  const [menu, setMenu] = React.useState(false);
  const newAccountRef = React.useRef<NewAccountRef>(null);
  const aboutRef = React.useRef<AboutRef>(null);
  const deleteAccountRef = React.useRef<DeleteAccountRef>(null);
  const builderRef = React.useRef<TransactionBuilderRef>(null);

  const canDeleteAccount = useMemo(
    () =>
      activeAccount.type === WalletType.Ledger ||
      activeAccount.type === WalletType.Trezor ||
      accounts.filter(a => a.walletId === activeAccount.walletId).length > 1,
    [accounts, activeAccount],
  );

  const onAccountClick = useCallback(
    async (account: Readonly<Account>) => {
      if (
        account.index === activeAccount.index &&
        account.walletId === activeAccount.walletId
      ) {
        return;
      }
      await activateAccount({
        accountIndex: account.index,
        walletId: account.walletId,
      });
    },
    [activeAccount, activateAccount],
  );

  return (
    <>
      <Box
        background={containerBg}
        minHeight="calc(100vh - 30px)"
        display="flex"
        alignItems="center"
        flexDirection="column"
        w="100%"
      >
        <Box
          height="52"
          roundedBottom="3xl"
          background={panelBg}
          shadow="md"
          width="full"
          position="relative"
        >
          <Box
            zIndex="2"
            position="absolute"
            top="6"
            left="6"
            width="14"
            height="14"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Image draggable={false} width="30px" src={Logo} />
          </Box>
          {/* Delegation */}
          <DelegationPopover builderRef={builderRef} />
          <Box
            data-testid="menu"
            zIndex="2"
            position="absolute"
            top="6"
            right="6"
          >
            <Menu
              placement="bottom-end"
              isOpen={menu}
              autoSelect={false}
              onClose={() => {
                setMenu(false);
              }}
            >
              <MenuButton
                onClick={() => {
                  setMenu(true);
                }}
                position="relative"
                rounded="full"
                background={avatarBg}
                width="14"
                height="14"
                _hover={{ filter: 'brightness(0.92)' }}
                _active={{ filter: 'brightness(0.84)' }}
              >
                <Box
                  position="absolute"
                  top="0"
                  right="0"
                  width={'full'}
                  height={'full'}
                  display={'flex'}
                  alignItems={'center'}
                  justifyContent={'center'}
                >
                  <AvatarLoader
                    avatar={activeAccount.avatar}
                    width="14"
                    smallRobot
                  />
                </Box>
              </MenuButton>
              <MenuList fontSize="xs">
                <MenuGroup title="Accounts">
                  <Scrollbars
                    style={{ width: '100%' }}
                    autoHeight
                    autoHeightMax={180}
                  >
                    {accounts.map(account => (
                      <UserInfo
                        index={`${account.walletId}${account.index}`}
                        key={`${account.walletId}${account.index}`}
                        onClick={() => {
                          onAccountClick(account);
                        }}
                        avatar={account.avatar}
                        name={account.name}
                        balance={account.balance?.[environmentName]}
                        isActive={
                          account.index === activeAccount.index &&
                          account.walletId === activeAccount.walletId
                        }
                        cardanoCoin={cardanoCoin}
                        isHW={
                          account.type === WalletType.Ledger ||
                          account.type === WalletType.Trezor
                        }
                      />
                    ))}
                  </Scrollbars>
                </MenuGroup>
                <MenuDivider />

                {activeAccount.type === WalletType.InMemory && (
                  <MenuItem
                    icon={<AddIcon />}
                    onClick={() => {
                      void capture(Events.SettingsNewAccountClick);
                      newAccountRef.current?.openModal();
                    }}
                  >
                    New Account
                  </MenuItem>
                )}
                {canDeleteAccount && (
                  <MenuItem
                    color="red.300"
                    icon={<DeleteIcon />}
                    onClick={() => {
                      void capture(Events.AccountDeleteClick);
                      deleteAccountRef.current?.openModal();
                    }}
                  >
                    Delete Account
                  </MenuItem>
                )}
                <Tooltip
                  shouldWrapChildren
                  isDisabled={process.env.BROWSER !== 'firefox'}
                  label={
                    'Hardware wallets are not supported due to Firefox limitations'
                  }
                  fontSize="sm"
                  hasArrow
                >
                  <MenuItem
                    isDisabled={process.env.BROWSER === 'firefox'}
                    icon={<Icon as={GiUsbKey} w={3} h={3} />}
                    onClick={(): void => {
                      void (async () => {
                        await capture(Events.HWConnectClick);
                        openHWFlow(TAB.hw);
                      })();
                    }}
                  >
                    Connect Hardware Wallet
                  </MenuItem>
                </Tooltip>
                <MenuDivider />
                <MenuItem
                  icon={<Icon as={FaRegFileCode} w={3} h={3} />}
                  onClick={() => {
                    capture(Events.SettingsCollateralClick);
                    builderRef.current?.initCollateral();
                  }}
                >
                  {' '}
                  Collateral
                </MenuItem>
                <MenuDivider />
                <MenuItem
                  onClick={() => {
                    history.push('/settings/');
                  }}
                  icon={<SettingsIcon />}
                >
                  Settings
                </MenuItem>
                <MenuItem onClick={() => aboutRef.current?.openModal()}>
                  About
                </MenuItem>
              </MenuList>
            </Menu>
          </Box>
          <Box
            zIndex="1"
            position="absolute"
            width="full"
            top="8"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text
              color="white"
              fontSize="lg"
              isTruncated={true}
              maxWidth="210px"
            >
              {activeAccount.name}
            </Text>
          </Box>
          <Box
            position="absolute"
            width="full"
            height="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <UnitDisplay
              color="white"
              fontSize="2xl"
              fontWeight="bold"
              quantity={
                balance && (balance - lockedCoins - unspendableCoins).toString()
              }
              decimals={6}
              symbol={cardanoCoin.symbol}
            />
            {lockedCoins > 0 || unspendableCoins ? (
              <Tooltip
                label={
                  <Box
                    fontWeight="normal"
                    display="flex"
                    flexDirection="column"
                  >
                    {lockedCoins > 0 && (
                      <Box>
                        <Box display="flex">
                          <Text mr="0.5">+</Text>
                          <UnitDisplay
                            quantity={lockedCoins}
                            symbol={cardanoCoin.symbol}
                            decimals={6}
                          />
                          <Text ml="1">locked with assets</Text>
                        </Box>
                      </Box>
                    )}
                    {!!unspendableCoins && (
                      <Box>
                        <Box display="flex">
                          <Text mr="0.5">+</Text>
                          <UnitDisplay
                            quantity={unspendableCoins}
                            symbol={cardanoCoin.symbol}
                            decimals={6}
                          />
                          <Text ml="1">Collateral</Text>
                        </Box>
                      </Box>
                    )}
                  </Box>
                }
                fontSize="sm"
                hasArrow
                placement="auto"
              >
                <InfoOutlineIcon
                  data-testid="balanceInfo"
                  cursor="help"
                  color="white"
                  ml="10px"
                  width="14px"
                  height="14px"
                  display="inline-block"
                />
              </Tooltip>
            ) : (
              ''
            )}
          </Box>
          <Box
            style={{ bottom: 66 }}
            position="absolute"
            width="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <UnitDisplay
              color="white"
              fontSize="md"
              quantity={
                balance &&
                Number.parseInt(
                  displayUnit(
                    balance - lockedCoins - unspendableCoins,
                  ).toString(),
                ) *
                  fiatPrice *
                  10 ** 2
              }
              symbol={currencyToSymbol(currency)}
              decimals={2}
            />
          </Box>

          <Box
            position="absolute"
            style={{ top: 186, right: 134 }}
            width="20"
            height="8"
          >
            <Popover>
              <PopoverTrigger>
                <Button
                  rightIcon={<Icon as={BsArrowDownRight} />}
                  colorScheme="teal"
                  size="sm"
                  rounded="xl"
                  shadow="md"
                  onClick={() => {
                    capture(Events.ReceiveClick);
                  }}
                >
                  Receive
                </Button>
              </PopoverTrigger>
              <PopoverContent width="60">
                <PopoverArrow />
                <PopoverBody
                  mt="5"
                  alignItems="center"
                  justifyContent="center"
                  display="flex"
                  flexDirection="column"
                  textAlign="center"
                >
                  <>
                    <Box>
                      <QrCode value={activeAddress} />
                    </Box>
                    <Box height="4" />
                    <Copy
                      label={<Box fontWeight="normal">Copied address</Box>}
                      copy={activeAddress}
                      onClick={() => {
                        capture(Events.ReceiveCopyAddressIconClick);
                      }}
                    >
                      <Text
                        maxWidth="200px"
                        fontSize="xs"
                        lineHeight="1.2"
                        cursor="pointer"
                        wordBreak="break-all"
                      >
                        {activeAddress} <CopyIcon />
                      </Text>
                    </Copy>
                    <Box height="2" />
                  </>
                </PopoverBody>
              </PopoverContent>
            </Popover>
          </Box>

          <Box
            position="absolute"
            style={{ top: 186, right: 24 }}
            width="20"
            height="8"
          >
            <Button
              onClick={() => {
                capture(Events.SendClick);
                history.push('/send');
              }}
              size="sm"
              rounded="xl"
              rightIcon={<Icon as={BsArrowUpRight} />}
              colorScheme="orange"
              shadow="md"
            >
              Send
            </Button>
          </Box>
        </Box>
        <Box height="8" />
        <Tabs
          isLazy={true}
          lazyBehavior="unmount"
          width="full"
          alignItems="center"
          display="flex"
          flexDirection="column"
          variant="soft-rounded"
          colorScheme="teal"
          position="relative"
        >
          <TabList>
            <Tab
              mr={2}
              onClick={() => {
                void capture(Events.AssetsClick);
              }}
            >
              <Icon as={GiTwoCoins} boxSize={5} />
            </Tab>
            <Tab
              mr={2}
              onClick={() => {
                void capture(Events.NFTsClick);
              }}
              data-testid="collectibles"
            >
              <Icon as={FaGamepad} boxSize={5} />
            </Tab>
            <Tab>
              <Icon
                as={BsClockHistory}
                boxSize={5}
                onClick={() => {
                  void capture(Events.ActivityActivityClick);
                }}
                data-testid="clockIcon"
              />
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <AssetsViewer assets={assets as NamiAsset[]} />
            </TabPanel>
            <TabPanel>
              <CollectiblesViewer assets={nfts} setAvatar={setAvatar} />
            </TabPanel>
            <TabPanel>
              <HistoryViewer />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
      {activeAccount?.type === WalletType.InMemory && (
        <NewAccountModal
          ref={newAccountRef}
          accounts={accounts}
          walletId={activeAccount?.walletId}
          addAccount={addAccount}
        />
      )}
      <DeleteAccountModal
        ref={deleteAccountRef}
        activateAccount={activateAccount}
        removeAccount={removeAccount}
        removeWallet={removeWallet}
        accounts={accounts}
        activeAccount={activeAccount}
      />
      <TransactionBuilder ref={builderRef} />
      <About ref={aboutRef} />
    </>
  );
};

interface NewAccountRef {
  openModal: () => void;
}

const NewAccountModal = React.forwardRef<
  NewAccountRef,
  {
    accounts: Props['accounts'];
    addAccount: Props['addAccount'];
    walletId: string;
  }
>(({ accounts, addAccount, walletId }, ref) => {
  const capture = useCaptureEvent();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isLoading, setIsLoading] = React.useState(false);
  const { secretsUtil } = useOutsideHandles();
  const [state, setState] = React.useState({
    show: false,
    name: '',
    wrongPassword: false,
  });

  const confirmHandler = async () => {
    setIsLoading(true);
    try {
      await addAccount({
        index: getNextAccountIndex(accounts, walletId),
        name: state.name,
        passphrase: Buffer.from(secretsUtil.password?.value ?? '', 'utf8'),
        walletId,
      });
      await capture(Events.SettingsNewAccountConfirmClick);
      secretsUtil.clearSecrets();
      // wait for digest
      setTimeout(onClose, 50);
    } catch {
      setState(s => ({ ...s, wrongPassword: true }));
      secretsUtil.clearSecrets();
    }
    setIsLoading(false);
  };

  React.useImperativeHandle(ref, () => ({
    openModal: () => {
      onOpen();
    },
  }));

  React.useEffect(() => {
    setState({
      show: false,
      name: '',
      wrongPassword: false,
    });
  }, [isOpen]);

  return (
    <Modal
      size="xs"
      isOpen={isOpen}
      onClose={() => {
        capture(Events.SettingsNewAccountXClick);
        onClose();
      }}
      isCentered
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="md">
          {' '}
          <Box display="flex" alignItems="center">
            <Icon as={BiWallet} mr="2" /> <Box>Create new account</Box>
          </Box>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody px="10">
          <Input
            autoFocus={true}
            onChange={e => {
              setState(s => ({ ...s, name: e.target.value }));
            }}
            placeholder="Enter account name"
          />
          <Spacer height="4" />
          <InputGroup size="md">
            <NamiPassword
              onChange={e => {
                secretsUtil.setPassword(e);
              }}
              onKeyDown={e => {
                if (e.key == 'Enter') confirmHandler();
              }}
              onSubmit={confirmHandler}
              label="Enter password"
            />
          </InputGroup>
          {state.wrongPassword && (
            <Text color="red.300">Password is wrong</Text>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            mr={3}
            variant="ghost"
            onClick={() => {
              capture(Events.SettingsNewAccountXClick);
              onClose();
            }}
          >
            Close
          </Button>
          <Button
            isDisabled={
              !secretsUtil.password?.value || !state.name || isLoading
            }
            isLoading={isLoading}
            colorScheme="teal"
            onClick={confirmHandler}
          >
            Create
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
});

NewAccountModal.displayName = 'NewAccountModal';

interface DeleteAccountRef {
  openModal: () => void;
}

const DeleteAccountModal = React.forwardRef<
  DeleteAccountRef,
  {
    activateAccount: UseAccount['activateAccount'];
    removeAccount: UseAccount['removeAccount'];
    removeWallet: UseAccount['removeWallet'];
    accounts: UseAccount['allAccounts'];
    activeAccount: UseAccount['activeAccount'];
  }
>(
  (
    { activateAccount, removeAccount, accounts, activeAccount, removeWallet },
    ref,
  ) => {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [isLoading, setIsLoading] = React.useState(false);
    const cancelRef = React.useRef(null);
    const capture = useCaptureEvent();

    React.useImperativeHandle(ref, () => ({
      openModal: () => {
        onOpen();
      },
    }));

    const nextAccount: Account | undefined = useMemo(
      () =>
        accounts.find(
          a =>
            a.index !== activeAccount.index &&
            a.walletId === activeAccount.walletId,
        ) ??
        accounts.find(
          a => a.type !== WalletType.Ledger && a.type !== WalletType.Trezor,
        ),
      [accounts, activeAccount],
    );

    const deleteAccount = useCallback(async () => {
      setIsLoading(true);
      const isLastAccont = !accounts.some(
        a =>
          a.walletId === activeAccount.walletId &&
          a.index !== activeAccount.index,
      );

      if (isLastAccont) {
        await removeWallet({
          nextWalletId: nextAccount?.walletId,
        });
      } else if (nextAccount) {
        await activateAccount({
          accountIndex: nextAccount?.index,
          walletId: nextAccount?.walletId,
          force: true,
        });
        setTimeout(async () => {
          await removeAccount({
            walletId: activeAccount.walletId,
            accountIndex: activeAccount.index,
          });
        }, 500);
      }
      capture(Events.AccountDeleteConfirmClick);
      onClose();
      setIsLoading(false);
    }, [
      setIsLoading,
      activateAccount,
      removeAccount,
      capture,
      onClose,
      nextAccount,
    ]);

    return (
      <AlertDialog
        size="xs"
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="md" fontWeight="bold">
              Delete current account
            </AlertDialogHeader>

            <AlertDialogBody>
              <Text fontSize="sm">
                Are you sure you want to delete <b>{activeAccount.name}</b>?
              </Text>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose} mr={3}>
                Cancel
              </Button>
              <Button
                isDisabled={isLoading}
                isLoading={isLoading}
                colorScheme="red"
                onClick={deleteAccount}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    );
  },
);

DeleteAccountModal.displayName = 'DeleteAccountModal';

const DelegationPopover = ({
  builderRef,
}: Readonly<{ builderRef: RefObject<TransactionBuilderRef> }>) => {
  const { buildDelegation, setSelectedStakePool, openExternalLink } =
    useOutsideHandles();
  const { inMemoryWallet, cardanoCoin } = useCommonOutsideHandles();
  const { delegation } = useDelegation({
    inMemoryWallet,
    buildDelegation,
    setSelectedStakePool,
  });
  const capture = useCaptureEvent();
  const ref = React.useRef<TransactionBuilderRef>(null);
  const containerBg = useColorModeValue('gray.800', 'white');
  const delegateButtonBg = useColorModeValue(
    'gray.100',
    'rgba(255, 255, 255, 0.08)',
  );
  const delegateButtonColor = useColorModeValue('rgb(26, 32, 44)', 'inherit');
  return (
    <Box zIndex="1" position="absolute" width="full" bottom="5" left="6">
      {delegation ? (
        <>
          <Popover offset={[80, 8]}>
            <PopoverTrigger>
              <Button
                data-testid="delegating"
                style={{
                  all: 'revert',
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                }}
                onClick={() => {
                  capture(Events.StakingClick);
                }}
                rightIcon={<ChevronDownIcon />}
              >
                {delegation.ticker || delegation.poolId.slice(-9)}
              </Button>
            </PopoverTrigger>
            <PopoverContent width="60">
              <PopoverArrow />
              <PopoverCloseButton />
              <PopoverBody
                mt="2"
                alignItems="center"
                justifyContent="center"
                display="flex"
                flexDirection="column"
                textAlign="center"
              >
                <Text
                  fontWeight="bold"
                  fontSize="md"
                  textDecoration="underline"
                  cursor="pointer"
                  onClick={() => {
                    openExternalLink(delegation.homepage);
                  }}
                >
                  {delegation.ticker}
                </Text>
                <Box h="2" />
                <Text fontWeight="light" fontSize="xs">
                  {delegation.description}
                </Text>
                <Box h="3" />
                <Text fontSize="xs">Available rewards:</Text>
                <UnitDisplay
                  hide
                  fontWeight="bold"
                  fontSize="sm"
                  quantity={delegation.rewards}
                  decimals={6}
                  symbol={cardanoCoin.symbol}
                />
                <Box h="4" />
                <Button
                  onClick={() => {
                    void capture(Events.StakingUnstakeClick);
                    ref.current?.initUndelegate();
                  }}
                  mt="5px"
                  colorScheme="red"
                  size="xm"
                  variant="link"
                  fontSize={12}
                >
                  Unstake
                </Button>
                <Box h="4" />
                <Flex direction="row" gap align="center">
                  <Text>Auto-withdraw rewards</Text>
                  <Tooltip
                    label={
                      <Text width="250px">
                        Rewards are automatically withdrawn when sending
                        transactions
                      </Text>
                    }
                    fontSize="sm"
                    hasArrow
                    placement="top"
                  >
                    <InfoOutlineIcon
                      data-testid="withdrawInfo"
                      cursor="help"
                      color={containerBg}
                      ml="10px"
                      width="14px"
                      height="14px"
                      display="inline-block"
                    />
                  </Tooltip>
                </Flex>
              </PopoverBody>
            </PopoverContent>
          </Popover>
          <TransactionBuilder ref={ref} />
        </>
      ) : (
        <Button
          onClick={() => {
            void capture(Events.StakingClick);
            builderRef?.current?.initDelegation();
          }}
          variant="solid"
          size="xs"
          color={delegateButtonColor}
          background={delegateButtonBg}
          rounded="lg"
        >
          Delegate
        </Button>
      )}
    </Box>
  );
};

DelegationPopover.displayName = 'DelegationPopover';

export default Wallet;
