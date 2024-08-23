import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Text,
  useColorMode,
  Switch as ButtonSwitch,
  Image,
  SkeletonCircle,
  Spinner,
  Checkbox,
  Input,
  InputGroup,
  InputRightElement,
  Icon,
  Select,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SunIcon,
  SmallCloseIcon,
  RepeatIcon,
  CheckIcon,
} from '@chakra-ui/icons';
import { Wallet } from '@lace/cardano';
import { getFavoriteIcon } from '../../../api/extension';
import Account from '../components/account';
import { Route, Switch, useHistory } from 'react-router-dom';
import ConfirmModal from '../components/confirmModal';
import { MdModeEdit } from 'react-icons/md';
import AvatarLoader from '../components/avatarLoader';
import { ChangePasswordModal } from '../components/changePasswordModal';
import { useCaptureEvent } from '../../../features/analytics/hooks';
import { Events } from '../../../features/analytics/events';
import { LegalSettings } from '../../../features/settings/legal/LegalSettings';
import { CurrencyCode } from '../../../adapters/currency';
import { UseAccount } from '../../../adapters/account';
import { OutsideHandlesContextValue } from '../../../features/outside-handles-provider';

type Props = {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  deleteWallet: (password: string) => Promise<void>;
  accountName: string;
  accountAvatar?: string;
  updateAccountMetadata: UseAccount['updateAccountMetadata'];
} & Pick<
  OutsideHandlesContextValue,
  | 'theme'
  | 'setTheme'
  | 'isAnalyticsOptIn'
  | 'removeDapp'
  | 'connectedDapps'
  | 'handleAnalyticsChoice'
  | 'switchNetwork'
  | 'environmentName'
  | 'availableChains'
  | 'enableCustomNode'
  | 'getCustomSubmitApiForNetwork'
  | 'defaultSubmitApi'
  | 'isValidURL'
>;

const Settings = ({
  currency,
  setCurrency,
  theme,
  setTheme,
  accountName,
  accountAvatar,
  isAnalyticsOptIn,
  connectedDapps,
  removeDapp,
  handleAnalyticsChoice,
  changePassword,
  deleteWallet,
  updateAccountMetadata,
  environmentName,
  switchNetwork,
  availableChains,
  enableCustomNode,
  getCustomSubmitApiForNetwork,
  defaultSubmitApi,
  isValidURL,
}: Props) => {
  const history = useHistory();
  const containerBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('rgb(26, 32, 44)', 'inherit');
  return (
    <>
      <Box
        minHeight="100vh"
        display="flex"
        alignItems="center"
        flexDirection="column"
        position="relative"
        background={containerBg}
        color={textColor}
      >
        <Account name={accountName} avatar={accountAvatar} />
        <Box position="absolute" top="24" left="6">
          <IconButton
            aria-label="back button"
            rounded="md"
            onClick={() => history.goBack()}
            variant="ghost"
            icon={<ChevronLeftIcon boxSize="7" />}
          />
        </Box>
        <Switch>
          <Route path="/settings/general">
            <GeneralSettings
              changePassword={changePassword}
              deleteWallet={deleteWallet}
              currency={currency}
              setCurrency={setCurrency}
              theme={theme}
              setTheme={setTheme}
              accountAvatar={accountAvatar}
              accountName={accountName}
              updateAccountMetadata={updateAccountMetadata}
            />
          </Route>
          <Route path="/settings/whitelisted">
            <Whitelisted
              connectedDapps={connectedDapps}
              removeDapp={removeDapp}
            />
          </Route>
          <Route path="/settings/network">
            <Network
              environmentName={environmentName}
              switchNetwork={switchNetwork}
              availableChains={availableChains}
              enableCustomNode={enableCustomNode}
              getCustomSubmitApiForNetwork={getCustomSubmitApiForNetwork}
              defaultSubmitApi={defaultSubmitApi}
              isValidURL={isValidURL}
            />
          </Route>
          <Route path="/settings/legal">
            <LegalSettings
              isAnalyticsOptIn={isAnalyticsOptIn}
              handleAnalyticsChoice={handleAnalyticsChoice}
            />
          </Route>
          <Route path="*">
            <Overview />
          </Route>
        </Switch>
      </Box>
    </>
  );
};

const Overview = () => {
  const capture = useCaptureEvent();
  const history = useHistory();
  const navigate = history.push;
  return (
    <>
      <Box height="10" />
      <Text fontSize="lg" fontWeight="bold">
        Settings
      </Text>
      <Box height="10" />
      <Button
        justifyContent="space-between"
        width="65%"
        rightIcon={<ChevronRightIcon />}
        variant="ghost"
        onClick={() => {
          navigate('/settings/general');
        }}
      >
        General settings
      </Button>
      <Box height="1" />
      <Button
        justifyContent="space-between"
        width="65%"
        rightIcon={<ChevronRightIcon />}
        variant="ghost"
        onClick={() => {
          capture(Events.SettingsAuthorizedDappsClick);
          navigate('whitelisted');
        }}
      >
        Whitelisted sites
      </Button>
      <Box height="1" />
      <Button
        justifyContent="space-between"
        width="65%"
        rightIcon={<ChevronRightIcon />}
        variant="ghost"
        onClick={() => {
          navigate('network');
        }}
      >
        Network
      </Button>
      <Box height="1" />
      <Button
        justifyContent="space-between"
        width="65%"
        rightIcon={<ChevronRightIcon />}
        variant="ghost"
        onClick={() => {
          navigate('legal');
        }}
      >
        Legal
      </Button>
    </>
  );
};

const GeneralSettings = ({
  currency,
  setCurrency,
  theme,
  setTheme,
  accountName,
  accountAvatar,
  changePassword,
  deleteWallet,
  updateAccountMetadata,
}: Pick<
  Props,
  | 'accountAvatar'
  | 'accountName'
  | 'changePassword'
  | 'currency'
  | 'deleteWallet'
  | 'setCurrency'
  | 'setTheme'
  | 'theme'
  | 'updateAccountMetadata'
>) => {
  const capture = useCaptureEvent();
  const [name, setName] = useState(accountName);
  const [originalName, setOriginalName] = useState(accountName);
  const { setColorMode } = useColorMode();
  const ref = useRef();
  const changePasswordRef = useRef();

  const nameHandler = async () => {
    await updateAccountMetadata({ name });
    setOriginalName(name);
  };

  const avatarHandler = async () => {
    await updateAccountMetadata({
      namiMode: { avatar: Math.random().toString() },
    });
    capture(Events.SettingsChangeAvatarClick);
  };

  return (
    <>
      <Box height="10" />
      <Text fontSize="lg" fontWeight="bold">
        General settings
      </Text>
      <Box height="6" />
      <InputGroup size="md" width="210px">
        <Input
          onKeyDown={e => {
            if (e.key == 'Enter' && name.length > 0 && name != originalName)
              nameHandler();
          }}
          placeholder="Change name"
          value={name}
          onChange={e => {
            setName(e.target.value);
          }}
          pr="4.5rem"
        />
        <InputRightElement width="4.5rem">
          {name == originalName ? (
            <Icon mr="-4" as={MdModeEdit} />
          ) : (
            <Button
              isDisabled={name.length <= 0}
              h="1.75rem"
              size="sm"
              onClick={nameHandler}
            >
              Apply
            </Button>
          )}
        </InputRightElement>
      </InputGroup>
      <Box height="6" />
      <Box display="flex" alignItems="center">
        <Box width="65px" height="65px">
          <AvatarLoader avatar={accountAvatar} width="full" />
        </Box>
        <Box w={4} />
        <IconButton
          aria-label="update avatar"
          onClick={() => {
            avatarHandler();
          }}
          rounded="md"
          size="sm"
          icon={<RepeatIcon />}
        />
      </Box>
      <Box height="6" />
      <Button
        size="sm"
        rounded="md"
        onClick={() => {
          const newTheme = theme == 'dark' ? 'light' : 'dark';
          if (theme === 'dark') {
            capture(Events.SettingsThemeLightModeClick);
          } else {
            capture(Events.SettingsThemeDarkModeClick);
          }
          setTheme(newTheme);
          setColorMode(newTheme);
        }}
        rightIcon={<SunIcon ml="2" />}
      >
        {theme == 'dark' ? 'Light' : 'Dark'}
      </Button>

      <Box height="6" />
      <Box display="flex" alignItems="center" justifyContent="center">
        <Text>USD</Text>
        <Box width="2" />
        <ButtonSwitch
          defaultChecked={currency !== CurrencyCode.USD}
          onChange={e => {
            if (e.target.checked) {
              setCurrency(CurrencyCode.EUR);
            } else {
              setCurrency(CurrencyCode.USD);
            }
          }}
        />
        <Box width="2" />
        <Text>EUR</Text>
      </Box>
      <Box height="15" />
      <Box height="5" />
      <Button
        colorScheme="orange"
        size="sm"
        onClick={() => {
          capture(Events.SettingsChangePasswordClick);
          changePasswordRef.current.openModal();
        }}
      >
        Change Password
      </Button>
      <Box height="10" />
      <Button
        size="xs"
        colorScheme="red"
        variant="link"
        onClick={() => {
          capture(Events.SettingsRemoveWalletClick);
          ref.current.openModal();
        }}
      >
        Reset Wallet
      </Button>
      <ConfirmModal
        info={
          <Box mb="4" fontSize="sm" width="full">
            The wallet will be reset.{' '}
            <b>Make sure you have written down your seed phrase.</b> It's the
            only way to recover your current wallet! <br />
            Type your password below, if you want to continue.
          </Box>
        }
        ref={ref}
        onCloseBtn={() => {
          capture(Events.SettingsHoldUpBackClick);
        }}
        sign={password => {
          capture(Events.SettingsHoldUpRemoveWalletClick);
          return deleteWallet(password);
        }}
        onConfirm={async (status, signedTx) => {
          if (status === true) window.close();
        }}
      />
      <ChangePasswordModal
        ref={changePasswordRef}
        changePassword={changePassword}
      />
    </>
  );
};

const Whitelisted = ({
  connectedDapps,
  removeDapp,
}: Pick<Props, 'connectedDapps' | 'removeDapp'>) => {
  const capture = useCaptureEvent();

  return (
    <Box
      width="100%"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
    >
      <Box height="10" />
      <Text fontSize="lg" fontWeight="bold">
        Whitelisted sites
      </Text>
      <Box height="6" />
      {connectedDapps ? (
        connectedDapps.length > 0 ? (
          connectedDapps.map(({ url, logo }, index) => (
            <Box
              mb="2"
              key={index}
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              width="65%"
            >
              <Image
                width="24px"
                src={logo || getFavoriteIcon(url)}
                fallback={<SkeletonCircle width="24px" height="24px" />}
              />
              <Text>{url.split('//')[1]}</Text>
              <SmallCloseIcon
                cursor="pointer"
                onClick={async () => {
                  capture(Events.SettingsAuthorizedDappsTrashBinIconClick);
                  await removeDapp(url);
                }}
              />
            </Box>
          ))
        ) : (
          <Box
            mt="200"
            width="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            color="GrayText"
          >
            No whitelisted sites
          </Box>
        )
      ) : (
        <Box
          mt="200"
          width="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Spinner color="teal" speed="0.5s" />
        </Box>
      )}

      <Box height="6" />
    </Box>
  );
};

type NetworkProps = Pick<
  OutsideHandlesContextValue,
  | 'switchNetwork'
  | 'environmentName'
  | 'availableChains'
  | 'enableCustomNode'
  | 'getCustomSubmitApiForNetwork'
  | 'defaultSubmitApi'
  | 'isValidURL'
>;

const Network = ({
  switchNetwork,
  environmentName,
  availableChains,
  enableCustomNode,
  getCustomSubmitApiForNetwork,
  defaultSubmitApi,
  isValidURL,
}: NetworkProps) => {
  const capture = useCaptureEvent();
  const {
    status: isCustomApiEnabledForCurrentNetwork,
    url: customSubmitTxUrl,
  } = getCustomSubmitApiForNetwork(environmentName);

  const [value, setValue] = useState(customSubmitTxUrl);
  const [isEnabled, setIsEnabled] = useState(
    Boolean(isCustomApiEnabledForCurrentNetwork),
  );
  const [applied, setApplied] = useState(false);

  const endpointHandler = useCallback(async () => {
    capture(Events.SettingsNetworkCustomNodeClick);
    await enableCustomNode(environmentName, value);
    setApplied(true);
    setTimeout(() => setApplied(false), 600);
  }, [environmentName, value]);

  useEffect(() => {
    setValue(customSubmitTxUrl);
    setIsEnabled(Boolean(isCustomApiEnabledForCurrentNetwork));
  }, [customSubmitTxUrl, isCustomApiEnabledForCurrentNetwork]);

  return (
    <>
      <Box height="10" />
      <Text fontSize="lg" fontWeight="bold">
        Network
      </Text>
      <Box height="6" />
      <Box display="flex" alignItems="center" justifyContent="center">
        <Select
          defaultValue={environmentName as string}
          onChange={async ({ target: { value } }) => {
            switch (value) {
              case 'Mainnet':
                capture(Events.SettingsNetworkMainnetClick);
                break;
              case 'Preprod':
                capture(Events.SettingsNetworkPreprodClick);
                break;
              case 'Preview':
                capture(Events.SettingsNetworkPreviewClick);
                break;
              default:
                break;
            }

            await switchNetwork(value as Wallet.ChainName);
          }}
        >
          {availableChains.map(network => (
            <option value={network as string}>{network}</option>
          ))}
        </Select>
      </Box>
      <Box height="8" />
      <Box display="flex" alignItems="center" justifyContent="center">
        <Checkbox
          isChecked={isEnabled}
          onChange={async e => {
            setIsEnabled(e.target.checked);
            if (!e.target.checked) {
              await enableCustomNode(environmentName, '');
            }
          }}
          size="md"
        />{' '}
        <Box width="2" /> <Text>Custom node</Text>
      </Box>
      <Box height="3" />
      <InputGroup size="md" width={'280px'}>
        <Input
          isDisabled={!isEnabled}
          fontSize={'xs'}
          value={value}
          placeholder={defaultSubmitApi}
          onKeyDown={e => {
            if (e.key == 'Enter' && isValidURL(value)) {
              endpointHandler();
            }
          }}
          onChange={e => setValue(e.target.value)}
          pr="4.5rem"
        />
        <InputRightElement width="4.5rem">
          <Button
            isDisabled={applied || !isEnabled || !isValidURL(value)}
            h="1.75rem"
            size="sm"
            onClick={endpointHandler}
          >
            {applied ? <CheckIcon color={'teal.400'} /> : 'Apply'}
          </Button>
        </InputRightElement>
      </InputGroup>
    </>
  );
};

export default Settings;
