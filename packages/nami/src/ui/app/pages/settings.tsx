/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable react/no-multi-comp */
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { WalletType } from '@cardano-sdk/web-extension';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SunIcon,
  SmallCloseIcon,
  RepeatIcon,
  CheckIcon,
} from '@chakra-ui/icons';
import {
  Box,
  Button,
  IconButton,
  Text,
  useColorMode,
  Switch as ButtonSwitch,
  Image,
  SkeletonCircle,
  Checkbox,
  Input,
  InputGroup,
  InputRightElement,
  Icon,
  Select,
  useColorModeValue,
  Flex,
  Spacer,
} from '@chakra-ui/react';
import { MdModeEdit } from 'react-icons/md';
import { Route, Switch, useHistory, useLocation } from 'react-router-dom';

import { CurrencyCode } from '../../../adapters/currency';
import { getFavoriteIcon } from '../../../api/extension';
import { Events } from '../../../features/analytics/events';
import { useCaptureEvent } from '../../../features/analytics/hooks';
import { LegalSettings } from '../../../features/settings/legal/LegalSettings';
import { useStoreActions } from '../../store';
import Account from '../components/account';
import AvatarLoader from '../components/avatarLoader';
import { ChangePasswordModal } from '../components/changePasswordModal';

import type { UseAccount } from '../../../adapters/account';
import type { OutsideHandlesContextValue } from '../../../features/outside-handles-provider';
import type { ChangePasswordModalComponentRef } from '../components/changePasswordModal';
import type { Wallet } from '@lace/cardano';
import type { CommonOutsideHandlesContextValue } from 'features/common-outside-handles-provider';

type Props = Pick<
  OutsideHandlesContextValue,
  | 'availableChains'
  | 'connectedDapps'
  | 'defaultSubmitApi'
  | 'enableCustomNode'
  | 'environmentName'
  | 'getCustomSubmitApiForNetwork'
  | 'handleAnalyticsChoice'
  | 'isAnalyticsOptIn'
  | 'isValidURL'
  | 'removeDapp'
  | 'setTheme'
  | 'switchNetwork'
  | 'theme'
> &
  Pick<CommonOutsideHandlesContextValue, 'walletType'> & {
    currency: CurrencyCode;
    setCurrency: (currency: CurrencyCode) => void;
    changePassword: (
      currentPassword: string,
      newPassword: string,
    ) => Promise<void>;
    accountName: string;
    accountAvatar?: string;
    updateAccountMetadata: UseAccount['updateAccountMetadata'];
    isCompatibilityMode: boolean;
    handleCompatibilityModeChoice: (isCompatibilityMode: boolean) => void;
  };

const Settings = ({
  currency,
  setCurrency,
  theme,
  setTheme,
  accountName,
  accountAvatar,
  isAnalyticsOptIn,
  isCompatibilityMode,
  connectedDapps,
  removeDapp,
  handleAnalyticsChoice,
  handleCompatibilityModeChoice,
  changePassword,
  updateAccountMetadata,
  environmentName,
  switchNetwork,
  availableChains,
  enableCustomNode,
  getCustomSubmitApiForNetwork,
  defaultSubmitApi,
  isValidURL,
  walletType,
}: Readonly<Props>) => {
  const history = useHistory();
  const location = useLocation();
  const containerBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('rgb(26, 32, 44)', 'inherit');
  const setIsLaceSwitchInProgress = useStoreActions(
    actions => actions.globalModel.laceSwitchStore.setIsLaceSwitchInProgress,
  );

  return (
    <Box
      minHeight="calc(100vh - 30px)"
      display="flex"
      alignItems="center"
      flexDirection="column"
      position="relative"
      background={containerBg}
      color={textColor}
      w="100%"
    >
      <Account name={accountName} avatar={accountAvatar} />
      <Box position="absolute" top="24" left="6">
        <IconButton
          aria-label="back button"
          rounded="md"
          onClick={() => {
            history.push(
              location.pathname === '/settings/' ? '/' : '/settings/',
            );
          }}
          variant="ghost"
          icon={<ChevronLeftIcon boxSize="7" />}
        />
      </Box>
      <Switch>
        <Route path="/settings/general" exact>
          <GeneralSettings
            changePassword={changePassword}
            currency={currency}
            setCurrency={setCurrency}
            theme={theme}
            setTheme={setTheme}
            accountAvatar={accountAvatar}
            accountName={accountName}
            updateAccountMetadata={updateAccountMetadata}
            walletType={walletType}
          />
        </Route>
        <Route path="/settings/whitelisted" exact>
          <Whitelisted
            connectedDapps={connectedDapps}
            removeDapp={removeDapp}
            isCompatibilityMode={isCompatibilityMode}
            handleCompatibilityModeChoice={handleCompatibilityModeChoice}
          />
        </Route>
        <Route path="/settings/network" exact>
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
        <Route path="/settings/legal" exact>
          <LegalSettings
            isAnalyticsOptIn={isAnalyticsOptIn}
            handleAnalyticsChoice={handleAnalyticsChoice}
          />
        </Route>
        <Route path="*">
          <Overview
            onShowLaceBanner={() => {
              setIsLaceSwitchInProgress(true);
            }}
          />
        </Route>
      </Switch>
    </Box>
  );
};

const Overview = ({ onShowLaceBanner }: { onShowLaceBanner: () => void }) => {
  const capture = useCaptureEvent();
  const history = useHistory();
  const navigate = history.push;

  const handleShowLaceBannerClick = () => {
    onShowLaceBanner();
    void capture(Events.SettingsSwitchToLaceModeClick);
  };

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
        rightIcon={
          <>
            <Box
              backgroundColor="teal.100"
              paddingX="4px"
              paddingY="2px"
              borderRadius="xl"
            >
              <Text fontSize="xs" fontWeight="medium" color="gray.900">
                New
              </Text>
            </Box>
            <ChevronRightIcon />
          </>
        }
        variant="ghost"
        onClick={handleShowLaceBannerClick}
      >
        Upgrade to Lace
      </Button>
      <Box height="1" />
      <Button
        justifyContent="space-between"
        width="65%"
        rightIcon={<ChevronRightIcon />}
        variant="ghost"
        onClick={() => {
          navigate('general');
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
  updateAccountMetadata,
  walletType,
}: Readonly<
  Pick<
    Props,
    | 'accountAvatar'
    | 'accountName'
    | 'changePassword'
    | 'currency'
    | 'setCurrency'
    | 'setTheme'
    | 'theme'
    | 'updateAccountMetadata'
    | 'walletType'
  >
>) => {
  const capture = useCaptureEvent();
  const [name, setName] = useState(accountName);
  const [originalName, setOriginalName] = useState(accountName);
  const { setColorMode } = useColorMode();
  const changePasswordRef = useRef<ChangePasswordModalComponentRef>(null);

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
      {walletType === WalletType.InMemory && (
        <>
          <Button
            colorScheme="orange"
            size="sm"
            onClick={() => {
              capture(Events.SettingsChangePasswordClick);
              changePasswordRef.current?.openModal();
            }}
          >
            Change Password
          </Button>
          <ChangePasswordModal
            ref={changePasswordRef}
            changePassword={changePassword}
          />
        </>
      )}
    </>
  );
};

const Whitelisted = ({
  connectedDapps,
  removeDapp,
  isCompatibilityMode,
  handleCompatibilityModeChoice,
}: Readonly<
  Pick<
    Props,
    | 'connectedDapps'
    | 'handleCompatibilityModeChoice'
    | 'isCompatibilityMode'
    | 'removeDapp'
  >
>) => {
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
      <Flex
        direction="column"
        width="78%"
        paddingTop="19px"
        alignItems="self-start"
      >
        <Text lineHeight="18px" fontSize="sm">
          DApp compatibility mode
        </Text>
        <Flex paddingTop="8px" alignItems="center">
          <Text lineHeight="18px" color="GrayText" fontSize="sm">
            Use this for DApps that support Nami but not Lace. Enable it to
            connect via Nami mode wallet integration
          </Text>
          <Spacer />
          <ButtonSwitch
            isChecked={isCompatibilityMode}
            onChange={() => {
              handleCompatibilityModeChoice(!isCompatibilityMode);
            }}
          />
        </Flex>
      </Flex>
      <Box height="6" />
      {connectedDapps?.length > 0 ? (
        connectedDapps.map(({ url, logo }, index) => (
          <Box
            mb="20px"
            key={index}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            width="78%"
            pr="11px"
          >
            <Image
              width="24px"
              src={logo || getFavoriteIcon(url)}
              fallback={<SkeletonCircle width="24px" height="24px" />}
            />
            <Text
              lineHeight="18px"
              fontSize="sm"
              display="flex"
              flex="1"
              pl="9px"
              pr="11px"
            >
              {url.split('//')[1]}
            </Text>
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
      )}
      <Box height="6" />
    </Box>
  );
};

type NetworkProps = Pick<
  OutsideHandlesContextValue,
  | 'availableChains'
  | 'defaultSubmitApi'
  | 'enableCustomNode'
  | 'environmentName'
  | 'getCustomSubmitApiForNetwork'
  | 'isValidURL'
  | 'switchNetwork'
>;

const Network = ({
  switchNetwork,
  environmentName,
  availableChains,
  enableCustomNode,
  getCustomSubmitApiForNetwork,
  defaultSubmitApi,
  isValidURL,
}: Readonly<NetworkProps>) => {
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
    await capture(Events.SettingsNetworkCustomNodeClick);
    await enableCustomNode(environmentName, value);
    setApplied(true);
    setTimeout(() => {
      setApplied(false);
    }, 600);
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
              case 'Mainnet': {
                capture(Events.SettingsNetworkMainnetClick);
                break;
              }
              case 'Preprod': {
                capture(Events.SettingsNetworkPreprodClick);
                break;
              }
              case 'Preview': {
                capture(Events.SettingsNetworkPreviewClick);
                break;
              }
              default: {
                break;
              }
            }

            await switchNetwork(value as Wallet.ChainName);
          }}
        >
          {availableChains.map(network => (
            <option key={network} value={network as string}>
              {network}
            </option>
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
          onChange={e => {
            setValue(e.target.value);
          }}
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
