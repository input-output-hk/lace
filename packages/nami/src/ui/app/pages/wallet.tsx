import React from 'react';

import {
  SettingsIcon,
  AddIcon,
  StarIcon,
  DeleteIcon,
  CopyIcon,
  ChevronDownIcon,
  InfoOutlineIcon,
} from '@chakra-ui/icons';
import {
  Button,
  Box,
  Spacer,
  Stack,
  Text,
  Icon,
  Image,
  Input,
  InputGroup,
  InputRightElement,
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
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import { BiWallet } from 'react-icons/bi';
import {
  BsArrowDownRight,
  BsArrowUpRight,
  BsClockHistory,
} from 'react-icons/bs';
import { FaGamepad, FaRegFileCode } from 'react-icons/fa';
import { GiTwoCoins, GiUsbKey } from 'react-icons/gi';
import { useHistory } from 'react-router-dom';

import {
  createTab,
  displayUnit,
  getAccounts,
  getCurrentAccount,
  getCurrentAccountIndex,
  getDelegation,
  getNetwork,
  getTransactions,
  isHW,
  updateAccount,
  onAccountChange,
} from '../../../api/extension';
import { currencyToSymbol } from '../../../api/util';
// Assets
import Logo from '../../../assets/img/logoWhite.svg';
import { TAB } from '../../../config/config';
import { Events } from '../../../features/analytics/events';
import { useCaptureEvent } from '../../../features/analytics/hooks';
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

import type { UseAccount } from '../../../adapters/account';
import type { CurrencyCode } from '../../../adapters/currency';
import type { OutsideHandlesContextValue } from '../../../features/outside-handles-provider';
import type { CardanoAsset, Asset as NamiAsset } from '../../../types/assets';

type Props = Pick<OutsideHandlesContextValue, 'cardanoCoin'> & {
  walletAddress: string;
  hasCollateral: boolean;
  collateralFee: bigint;
  removeAccount: UseAccount['removeAccount'];
  activateAccount: UseAccount['activateAccount'];
  addAccount: UseAccount['addAccount'];
  nextIndex: number;
  currency: CurrencyCode;
  activeAccount: UseAccount['activeAccount'];
  accounts: UseAccount['allAccounts'];
  balance: bigint;
  fiatPrice: number;
  lockedCoins: bigint;
  unspendableCoins: bigint;
  isInitializingCollateral: boolean;
  initializeCollateral: () => Promise<void>;
  submitCollateral: (password: string) => Promise<void>;
  reclaimCollateral: () => Promise<void>;
  assets: (CardanoAsset | NamiAsset)[];
  nfts: NamiAsset[];
  setAvatar: (image: string) => void;
};

const useIsMounted = () => {
  const isMounted = React.useRef(false);
  React.useEffect(() => {
    isMounted.current = true;
    return () => (isMounted.current = false);
  }, []);
  return isMounted;
};

const Wallet = ({
  walletAddress,
  collateralFee,
  hasCollateral,
  isInitializingCollateral,
  nextIndex,
  currency,
  activeAccount,
  accounts,
  balance,
  fiatPrice,
  lockedCoins,
  unspendableCoins,
  cardanoCoin,
  reclaimCollateral,
  submitCollateral,
  initializeCollateral,
  addAccount,
  activateAccount,
  removeAccount,
  assets,
  nfts,
  setAvatar,
}: Readonly<Props>) => {
  const capture = useCaptureEvent();
  const isMounted = useIsMounted();
  const history = useHistory();
  const delegateButtonBg = useColorModeValue(
    'gray.100',
    'rgba(255, 255, 255, 0.08)',
  );
  const delegateButtonColor = useColorModeValue('rgb(26, 32, 44)', 'inherit');
  const avatarBg = useColorModeValue('white', 'gray.700');
  const panelBg = useColorModeValue('#349EA3', 'gray.800');
  const containerBg = useColorModeValue('white', 'gray.800');
  const [state, setState] = React.useState({
    account: null,
    accounts: null,
    delegation: null,
    network: { id: '', node: '' },
  });
  const [menu, setMenu] = React.useState(false);
  const newAccountRef = React.useRef();
  const aboutRef = React.useRef();
  const deletAccountRef = React.useRef();
  const [info, setInfo] = React.useState({
    avatar: '',
    name: '',
    paymentAddr: '',
    accounts: {},
  }); // for quicker displaying
  const builderRef = React.useRef();

  const checkTransactions = () =>
    setInterval(async () => {
      const currentAccount = await getCurrentAccount();
      const transactions = await getTransactions();
      const network = await getNetwork();
      if (
        transactions.length > 0 &&
        currentAccount[network.id].lastUpdate !== transactions[0].txHash
      ) {
        await getData();
      }
    }, 10_000);

  const getData = async forceUpdate => {
    const currentIndex = await getCurrentAccountIndex();
    const accounts = await getAccounts();
    const { avatar, name, index, paymentAddr } = accounts[currentIndex];
    if (!isMounted.current) return;
    setInfo({ avatar, name, currentIndex: index, paymentAddr, accounts });
    setState(s => ({
      ...s,
      account: null,
      delegation: null,
    }));
    await updateAccount(forceUpdate);
    const allAccounts = await getAccounts();
    const currentAccount = allAccounts[currentIndex];
    const network = await getNetwork();
    const delegation = await getDelegation();
    if (!isMounted.current) return;
    setState(s => ({
      ...s,
      account: currentAccount,
      accounts: allAccounts,
      network,
      delegation,
    }));
  };

  React.useEffect(() => {
    let accountChangeHandler;
    let txInterval;
    getData().then(() => {
      if (!isMounted.current) return;
      txInterval = checkTransactions();
      accountChangeHandler = onAccountChange(async () => getData());
    });
    return () => {
      clearInterval(txInterval);
      accountChangeHandler && accountChangeHandler.remove();
    };
  }, []);

  return (
    <>
      <Box
        background={containerBg}
        minHeight="100vh"
        display="flex"
        alignItems="center"
        flexDirection="column"
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
          <Box zIndex="1" position="absolute" width="full" bottom="5" left="6">
            {state.delegation && (
              <>
                {state.delegation.active ? (
                  <DelegationPopover
                    account={state.account}
                    delegation={state.delegation}
                  >
                    {state.delegation.ticker ||
                      state.delegation.poolId.slice(-9)}
                  </DelegationPopover>
                ) : (
                  <Button
                    onClick={() => {
                      capture(Events.StakingClick);
                      builderRef.current.initDelegation(
                        state.account,
                        state.delegation,
                      );
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
              </>
            )}
          </Box>
          <Box
            data-testid="menu"
            zIndex="2"
            position="absolute"
            top="6"
            right="6"
          >
            <Menu
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
                    autoHeightMax={210}
                  >
                    {accounts.map(account => {
                      return (
                        <MenuItem
                          position="relative"
                          key={account.index}
                          onClick={async () => {
                            if (account.index === activeAccount.index) {
                              return;
                            }
                            await activateAccount(account.index);
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            width="full"
                          >
                            <Box
                              width={'30px'}
                              height={'30px'}
                              mr="12px"
                              display={'flex'}
                              alignItems={'center'}
                              justifyContent={'center'}
                            >
                              <AvatarLoader
                                avatar={account.avatar}
                                width={'30px'}
                              />
                            </Box>

                            <Box
                              display="flex"
                              alignItems="center"
                              width="full"
                            >
                              <Box display="flex" flexDirection="column">
                                <Box height="1.5" />
                                <Text
                                  mb="-1"
                                  fontWeight="bold"
                                  fontSize="14px"
                                  isTruncated={true}
                                  maxWidth="210px"
                                >
                                  {account.name}
                                </Text>
                                {account ? (
                                  <UnitDisplay
                                    quantity={account.balance}
                                    decimals={6}
                                    symbol={cardanoCoin.symbol}
                                  />
                                ) : (
                                  <Text>...</Text>
                                )}
                              </Box>
                              {account.index === activeAccount.index && (
                                <>
                                  <Box width="4" />
                                  <StarIcon />
                                  <Box width="4" />
                                </>
                              )}
                              {isHW(account.index) && (
                                <Box ml="auto" mr="2">
                                  HW
                                </Box>
                              )}
                            </Box>
                          </Stack>
                        </MenuItem>
                      );
                    })}
                  </Scrollbars>
                </MenuGroup>
                <MenuDivider />

                <MenuItem
                  icon={<AddIcon />}
                  onClick={() => {
                    capture(Events.SettingsNewAccountClick);
                    newAccountRef.current.openModal();
                  }}
                >
                  New Account
                </MenuItem>
                {(isHW(activeAccount.index) ||
                  activeAccount.index >=
                    accounts.filter(({ index }) => !isHW(index)).length - 1) &&
                  accounts.length > 1 && (
                    <MenuItem
                      color="red.300"
                      icon={<DeleteIcon />}
                      onClick={() => {
                        capture(Events.AccountDeleteClick);
                        deletAccountRef.current.openModal();
                      }}
                    >
                      Delete Account
                    </MenuItem>
                  )}
                <MenuItem
                  icon={<Icon as={GiUsbKey} w={3} h={3} />}
                  onClick={() => {
                    capture(Events.HWConnectClick);
                    createTab(TAB.hw);
                  }}
                >
                  Connect Hardware Wallet
                </MenuItem>
                <MenuDivider />
                <MenuItem
                  icon={<Icon as={FaRegFileCode} w={3} h={3} />}
                  onClick={() => {
                    capture(Events.SettingsCollateralClick);
                    builderRef.current.initCollateral();
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
                <MenuItem onClick={() => aboutRef.current.openModal()}>
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
                    {unspendableCoins && (
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
                      <QrCode value={walletAddress} />
                    </Box>
                    <Box height="4" />
                    <Copy
                      label={<Box fontWeight="normal">Copied address</Box>}
                      copy={walletAddress}
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
                        {walletAddress} <CopyIcon />
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
                capture(Events.AssetsClick);
              }}
            >
              <Icon as={GiTwoCoins} boxSize={5} />
            </Tab>
            <Tab
              mr={2}
              onClick={() => {
                capture(Events.NFTsClick);
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
                  capture(Events.ActivityActivityClick);
                }}
                data-testid="clockIcon"
              />
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <AssetsViewer assets={assets} />
            </TabPanel>
            <TabPanel>
              <CollectiblesViewer assets={nfts} setAvatar={setAvatar} />
            </TabPanel>
            <TabPanel>
              <HistoryViewer
                network={state.network}
                history={state.account && state.account.history}
                currentAddr={state.account && state.account.paymentAddr}
                addresses={
                  state.accounts &&
                  Object.keys(state.accounts).map(
                    index => state.accounts[index].paymentAddr,
                  )
                }
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
      <NewAccountModal
        ref={newAccountRef}
        nextIndex={nextIndex}
        addAccount={addAccount}
      />
      <DeleteAccountModal
        ref={deletAccountRef}
        name={activeAccount.name}
        accountIndex={activeAccount.index}
        activateAccount={activateAccount}
        removeAccount={removeAccount}
      />
      <TransactionBuilder
        ref={builderRef}
        hasCollateral={hasCollateral}
        collateralFee={collateralFee}
        isInitializingCollateral={isInitializingCollateral}
        initializeCollateral={initializeCollateral}
        submitCollateral={submitCollateral}
        reclaimCollateral={reclaimCollateral}
        onConfirm={forceUpdate => getData(forceUpdate)}
      />
      <About ref={aboutRef} />
    </>
  );
};

const NewAccountModal = React.forwardRef<
  unknown,
  {
    nextIndex: Props['nextIndex'];
    addAccount: Props['addAccount'];
  }
>(({ nextIndex, addAccount }, ref) => {
  const capture = useCaptureEvent();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isLoading, setIsLoading] = React.useState(false);
  const [state, setState] = React.useState({
    password: '',
    show: false,
    name: '',
  });

  const confirmHandler = async () => {
    setIsLoading(true);
    try {
      await addAccount({
        index: nextIndex,
        name: state.name,
        passphrase: Buffer.from(state.password, 'utf8'),
      });
      capture(Events.SettingsNewAccountConfirmClick);
      onClose();
    } catch {
      setState(s => ({ ...s, wrongPassword: true }));
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
      password: '',
      show: false,
      name: '',
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
            <Input
              variant="filled"
              isInvalid={state.wrongPassword === true}
              pr="4.5rem"
              type={state.show ? 'text' : 'password'}
              onChange={e => {
                setState(s => ({ ...s, password: e.target.value }));
              }}
              placeholder="Enter password"
              onKeyDown={e => {
                if (e.key == 'Enter') confirmHandler();
              }}
            />
            <InputRightElement width="4.5rem">
              <Button
                h="1.75rem"
                size="sm"
                onClick={() => {
                  setState(s => ({ ...s, show: !s.show }));
                }}
              >
                {state.show ? 'Hide' : 'Show'}
              </Button>
            </InputRightElement>
          </InputGroup>
          {state.wrongPassword === true && (
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
            isDisabled={!state.password || !state.name || isLoading}
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

const DeleteAccountModal = React.forwardRef<
  unknown,
  {
    name: string;
    accountIndex: number;
    activateAccount: (index: number, force: boolean) => Promise<void>;
    removeAccount: (index: number) => Promise<void>;
  }
>(({ name, accountIndex, activateAccount, removeAccount }, ref) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isLoading, setIsLoading] = React.useState(false);
  const cancelRef = React.useRef();
  const capture = useCaptureEvent();

  React.useImperativeHandle(ref, () => ({
    openModal: () => {
      onOpen();
    },
  }));

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
              Are you sure you want to delete <b>{name}</b>?
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
              onClick={async () => {
                setIsLoading(true);
                await activateAccount(0, true);
                await removeAccount(accountIndex);
                capture(Events.AccountDeleteConfirmClick);
                onClose();
                setIsLoading(false);
              }}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
});

const DelegationPopover = ({ account, delegation, children }) => {
  const capture = useCaptureEvent();
  const { cardanoCoin } = useOutsideHandles();
  const withdrawRef = React.useRef();
  return (
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
            {children}
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
              onClick={() => window.open(delegation.homepage)}
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
            <Tooltip
              placement="top"
              isDisabled={BigInt(delegation.rewards) >= BigInt('2000000')}
              label="2 ADA minimum"
            >
              <span>
                <Button
                  onClick={() =>
                    withdrawRef.current.initWithdrawal(account, delegation)
                  }
                  isDisabled={BigInt(delegation.rewards) < BigInt('2000000')}
                  colorScheme="teal"
                  size="sm"
                >
                  Withdraw
                </Button>
              </span>
            </Tooltip>
            <Button
              onClick={() => {
                capture(Events.StakingUnstakeClick);
                withdrawRef.current.initUndelegate(account, delegation);
              }}
              mt="10px"
              colorScheme="red"
              size="xm"
              variant="link"
              fontSize={12}
            >
              Unstake
            </Button>
            <Box h="2" />
          </PopoverBody>
        </PopoverContent>
      </Popover>
      <TransactionBuilder ref={withdrawRef} />
    </>
  );
};

export default Wallet;
