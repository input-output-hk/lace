import React from 'react';

import { Box, useColorMode } from '@chakra-ui/react';
import type { Meta, StoryObj } from '@storybook/react';
import { screen, userEvent, within } from '@storybook/test';

import { Route } from '../../../../.storybook/mocks/react-router-dom.mock';
import {
  createTab,
  getAccounts,
  getCurrentAccount,
  getNetwork,
  isValidAddress,
  getAsset,
  getAdaHandle,
  isValidEthAddress,
  getUtxos,
  updateRecentSentToAddress,
} from '../../../api/extension/api.mock';
import { initTx, buildTx } from '../../../api/extension/wallet.mock';
import {
  minAdaRequired,
  sumUtxos,
  valueToAssets,
} from '../../../api/util.mock';
import { account, account1, currentAccount } from '../../../mocks/account.mock';
import { network } from '../../../mocks/network.mock';
import { store } from '../../../mocks/store.mock';
import { tokens } from '../../../mocks/token.mock';
import { protocolParameters } from '../../../mocks/transaction.mock';
import { useStoreState, useStoreActions } from '../../store.mock';

import Send from './send';

const SendStory = ({
  colorMode,
}: Readonly<{ colorMode: 'dark' | 'light' }>): React.ReactElement => {
  const { setColorMode } = useColorMode();
  setColorMode(colorMode);

  return (
    <Box width="400" height="600">
      <Send />
    </Box>
  );
};

const customViewports = {
  popup: {
    name: 'Popup',
    styles: {
      width: '400px',
      height: '600px',
    },
  },
};

const txInfo = {
  protocolParameters: {
    linearFee: {
      minFeeA: '44',
      minFeeB: '155381',
    },
    minUtxo: '969750',
    poolDeposit: '500000000',
    keyDeposit: '2000000',
    coinsPerUtxoWord: '4310',
    maxValSize: '5000',
    priceMem: 0.0577,
    priceStep: 0.000_072_1,
    maxTxSize: 16_384,
    slot: 62_712_496,
    collateralPercentage: 150,
    maxCollateralInputs: 3,
  },
  utxos: [
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e0082583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a4bded64ba1581c212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995fa14954657374546f6b656e09',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e0182583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a4be4a304a1581c648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198a1434441491a00895440',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e0282583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a4be4a304a1581cf0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9aa148000de1406b6c6f7301',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e0382583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a4be4a304a1581c212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995fa1494d657368546f6b656e0a',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e0482583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a4be4a303a1581cf6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e3a14674484f534b591865',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e0582583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a25f25182a1581c0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d3a14e4e6f6e5371756172654e6674323501',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e0682583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a25f25182a1581c648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198a144555344541a00895440',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e0782583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a25f25182a1581cc4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19eaa152546573744275647a50726570726f645f323301',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e0882583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a25f25182a1581cc4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19eaa152546573744275647a50726570726f645f323401',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e0982583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a25f25182a1581cc4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19eaa153546573744275647a50726570726f645f31303001',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e0a82583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a12f928c1a1581cc4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19eaa152546573744275647a50726570726f645f333801',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e0b82583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a12f928c1a1581cc4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19eaa152546573744275647a50726570726f645f343701',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e0c82583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a12f928c1a1581ce517b38693b633f1bc0dd3eb69cb1ad0f0c198c67188405901ae63a3a157001bc28068616e646c65735f6e61747572652d6c616b6501',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e0d82583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a12f928c1a1581cf6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e3a144744d494e1a0156e529',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e0e82583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a12f928c1a1581c648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198a144446a65641a00a7d8bf',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e0f82583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a097c9461a1581c648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198a144555344431a003d0900',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e1082583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a097c9461a1581cc4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19eaa152546573744275647a50726570726f645f323801',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e1182583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a097c9461a1581c2660d5a40acd9d93945c5f44352d34867241826ffbc7bdcaa6a30beaa144574e465401',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e1382583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a097c9460a1581cc4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19eaa152546573744275647a50726570726f645f343501',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e1482583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a04be4a30a1581cf0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9aa14d000de1406e69747069636b657201',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e1582583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a04be4a30a1581cc4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19eaa151546573744275647a50726570726f645f3101',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e1682583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a04be4a30a1581c0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d3a14e4e6f6e5371756172654e6674323001',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e1782583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a1a04be4a30',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e181882583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a1a04be4a30',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e181982583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a1a025f2518',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e181a82583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a1a025f2518',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e181b82583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a1a025f2518',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e181c82583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a1a025f2518',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e181d82583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a1a025f2518',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e181e82583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a1a025f2518',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e181f82583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a1a025f2518',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e182082583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a1a025f2518',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e182182583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a1a025f2518',
    '8282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e182282583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a1a025f2518',
    '82825820fe75f4b07d911a124b14f29b6c5ebf82ec012e8aa357ce03f1bec54ff3878eca0082583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a1a004c4b40',
    '82825820fe75f4b07d911a124b14f29b6c5ebf82ec012e8aa357ce03f1bec54ff3878eca0182583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a0011a008a1581c648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198a144695553441a00a7d8bf',
    '82825820fe75f4b07d911a124b14f29b6c5ebf82ec012e8aa357ce03f1bec54ff3878eca0282583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a1a091c050c',
  ],
  balance: {
    lovelace: '12732198240',
    assets: [
      {
        unit: '0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d34e6f6e5371756172654e66743235',
        quantity: '100000000000',
        policy: '0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d3',
        name: 'NonSquareNft25',
        fingerprint: 'asset15tfh93yjsffr7v9fepepuq2w4scl58eeaszmx7',
      },
      {
        unit: '212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995f54657374546f6b656e',
        quantity: '9',
        policy: '212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995f',
        name: 'TestToken',
        fingerprint: 'asset16cee8gr79j5k4ag5v8wlk5ygg5fjyech5ugykj',
      },
      {
        unit: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198444149',
        quantity: '9000000',
        policy: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198',
        name: 'DAI',
        fingerprint: 'asset1vdkz0fx34r9km5xf4l5jk3emyysfamw5xr3yc2',
      },
      {
        unit: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198446a6564',
        quantity: '10999999',
        policy: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198',
        name: 'Djed',
        fingerprint: 'asset1spcamsngdptfa0nr2r48e8720ry4k8mt6me5e4',
      },
      {
        unit: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19855534443',
        quantity: '4000000',
        policy: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198',
        name: 'USDC',
        fingerprint: 'asset1qketn3dc3hq5eudhpfrfnet9f7uk3ffpkt3vn5',
      },
      {
        unit: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19855534454',
        quantity: '9000000',
        policy: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198',
        name: 'USDT',
        fingerprint: 'asset1tnlqa0d3qqjrpsx3h9vjq9e3x6yurq7w7pwl2d',
      },
      {
        unit: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19869555344',
        quantity: '10999999',
        policy: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198',
        name: 'iUSD',
        fingerprint: 'asset1z68cfhqv29phnmlcczdjc9p28j2jl9f5jx8kqa',
      },
      {
        unit: 'e517b38693b633f1bc0dd3eb69cb1ad0f0c198c67188405901ae63a3001bc28068616e646c65735f6e61747572652d6c616b65',
        quantity: '1',
        policy: 'e517b38693b633f1bc0dd3eb69cb1ad0f0c198c67188405901ae63a3',
        name: '\u0000\u001Bhandles_nature-lake',
        fingerprint: 'asset1juxtmgjasyr58hp523sn4n24yk0feqga6wxfh9',
      },
      {
        unit: 'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e3744d494e',
        quantity: '22471977',
        policy: 'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e3',
        name: 'tMIN',
        fingerprint: 'asset1dcspl93vqst7k7fcz2vx4mu6jvq7hsrse7zlpv',
      },
      {
        unit: 'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e374484f534b59',
        quantity: '101',
        policy: 'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e3',
        name: 'tHOSKY',
        fingerprint: 'asset15qks69wv4vk7clnhp4lq7x0rpk6vs0s6exw0ry',
      },
    ],
  },
  milkomedaAddress: '123213',
};

const address = {
  display:
    'addr_test1qznkfw45dhtkr6f60hgw6rktmza7ll7achyv2w7vsx2khhcvec23vqjpq7wzwfq78j44xkyy6rg6435skpst6ju0j4tqfcx0ze',
  result:
    'addr_test1qznkfw45dhtkr6f60hgw6rktmza7ll7achyv2w7vsx2khhcvec23vqjpq7wzwfq78j44xkyy6rg6435skpst6ju0j4tqfcx0ze',
};

const meta: Meta<typeof SendStory> = {
  title: 'Send',
  component: SendStory,
  parameters: {
    viewport: {
      viewports: customViewports,
      defaultViewport: 'popup',
    },
    layout: 'centered',
  },
  beforeEach: () => {
    createTab.mockImplementation(async () => {
      await Promise.resolve();
    });
    getAccounts.mockImplementation(async () => {
      return await Promise.resolve([account, account1]);
    });
    getCurrentAccount.mockImplementation(async () => {
      return await Promise.resolve(currentAccount);
    });
    getNetwork.mockImplementation(async () => {
      return await Promise.resolve(network);
    });
    isValidAddress.mockImplementation(async () => {
      return await Promise.resolve(true);
    });
    useStoreState.mockImplementation((callback: any) => {
      return callback({
        ...store,
        globalModel: {
          sendStore: {
            ...store.globalModel.sendStore,
            txInfo,
          },
        },
      });
    });
    useStoreActions.mockImplementation(() => {
      return () => void 0;
    });
    getAdaHandle.mockImplementation(async () => {
      return () => void 0;
    });
    updateRecentSentToAddress.mockImplementation(async () => {
      return () => void 0;
    });
    getAsset.mockImplementation(async (unit: keyof typeof tokens) => {
      return await Promise.resolve(tokens[unit]);
    });
    minAdaRequired.mockImplementation(async () => {
      return await Promise.resolve('969750');
    });
    isValidEthAddress.mockImplementation(() => {
      return true;
    });
    getUtxos.mockImplementation(async () => {
      return [];
    });
    sumUtxos.mockImplementation(async () => {
      return await {};
    });
    valueToAssets.mockImplementation(async () => {
      return [
        {
          unit: 'lovelace',
          quantity: '12732198240',
        },
        {
          unit: '0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d34e6f6e5371756172654e66743230',
          quantity: '1',
          policy: '0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d3',
          name: 'NonSquareNft20',
          fingerprint: 'asset1rek9ra6g07g0gn08wpdr5j5erpgaly82dp7p3e',
        },
        {
          unit: '0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d34e6f6e5371756172654e66743235',
          quantity: '1000000000000000',
          policy: '0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d3',
          name: 'NonSquareNft25',
          fingerprint: 'asset15tfh93yjsffr7v9fepepuq2w4scl58eeaszmx7',
        },
        {
          unit: '212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995f4d657368546f6b656e',
          quantity: '10',
          policy: '212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995f',
          name: 'MeshToken',
          fingerprint: 'asset1f978wq5zjdm7rfjtjyy2rq0xtvm8n7ymtcezz9',
        },
        {
          unit: '212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995f54657374546f6b656e',
          quantity: '9',
          policy: '212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995f',
          name: 'TestToken',
          fingerprint: 'asset16cee8gr79j5k4ag5v8wlk5ygg5fjyech5ugykj',
        },
        {
          unit: '2660d5a40acd9d93945c5f44352d34867241826ffbc7bdcaa6a30bea574e4654',
          quantity: '1',
          policy: '2660d5a40acd9d93945c5f44352d34867241826ffbc7bdcaa6a30bea',
          name: 'WNFT',
          fingerprint: 'asset1yzr8l9sp2rh7nwxcu8q8e6qep7c5hdqjyy8cj7',
        },
        {
          unit: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198444149',
          quantity: '9000000',
          policy: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198',
          name: 'DAI',
          fingerprint: 'asset1vdkz0fx34r9km5xf4l5jk3emyysfamw5xr3yc2',
        },
        {
          unit: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198446a6564',
          quantity: '10999999',
          policy: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198',
          name: 'Djed',
          fingerprint: 'asset1spcamsngdptfa0nr2r48e8720ry4k8mt6me5e4',
        },
        {
          unit: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19855534443',
          quantity: '4000000',
          policy: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198',
          name: 'USDC',
          fingerprint: 'asset1qketn3dc3hq5eudhpfrfnet9f7uk3ffpkt3vn5',
        },
        {
          unit: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19855534454',
          quantity: '9000000',
          policy: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198',
          name: 'USDT',
          fingerprint: 'asset1tnlqa0d3qqjrpsx3h9vjq9e3x6yurq7w7pwl2d',
        },
        {
          unit: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19869555344',
          quantity: '10999999',
          policy: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198',
          name: 'iUSD',
          fingerprint: 'asset1z68cfhqv29phnmlcczdjc9p28j2jl9f5jx8kqa',
        },
        {
          unit: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea546573744275647a50726570726f645f31',
          quantity: '1',
          policy: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea',
          name: 'TestBudzPreprod_1',
          fingerprint: 'asset18utzq4udqm70n399h7m7v7qzdhjp3cpt6yp8cl',
        },
        {
          unit: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea546573744275647a50726570726f645f3233',
          quantity: '1',
          policy: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea',
          name: 'TestBudzPreprod_23',
          fingerprint: 'asset18zhpwmqxhrng4spexwttrfx4ajlw4gtyh24tpz',
        },
        {
          unit: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea546573744275647a50726570726f645f3234',
          quantity: '1',
          policy: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea',
          name: 'TestBudzPreprod_24',
          fingerprint: 'asset1h34maftvhamg7qhsjyzwjcae98xf2t2czfhyh4',
        },
        {
          unit: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea546573744275647a50726570726f645f3238',
          quantity: '1',
          policy: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea',
          name: 'TestBudzPreprod_28',
          fingerprint: 'asset1n5y5zafdgkfxshenswuqcs9qh3yl0n8hcwkpsk',
        },
        {
          unit: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea546573744275647a50726570726f645f3338',
          quantity: '1',
          policy: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea',
          name: 'TestBudzPreprod_38',
          fingerprint: 'asset1tn60277efvhnx2wn2gc5va86ccltajjkk33l09',
        },
        {
          unit: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea546573744275647a50726570726f645f3435',
          quantity: '1',
          policy: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea',
          name: 'TestBudzPreprod_45',
          fingerprint: 'asset184z5gkmx7wgdf7fm5knj755nvsu6d82un30v7t',
        },
        {
          unit: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea546573744275647a50726570726f645f3437',
          quantity: '1',
          policy: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea',
          name: 'TestBudzPreprod_47',
          fingerprint: 'asset150hq9etu9ep77ntrq08kh73n5p9f8w9hxqkng0',
        },
        {
          unit: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea546573744275647a50726570726f645f313030',
          quantity: '1',
          policy: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea',
          name: 'TestBudzPreprod_100',
          fingerprint: 'asset1w85hq3d57h8hmhjj9f58juzuyj8l64kq2k6yk8',
        },
        {
          unit: 'e517b38693b633f1bc0dd3eb69cb1ad0f0c198c67188405901ae63a3001bc28068616e646c65735f6e61747572652d6c616b65',
          quantity: '1',
          policy: 'e517b38693b633f1bc0dd3eb69cb1ad0f0c198c67188405901ae63a3',
          name: '\u0000\u001Bhandles_nature-lake',
          fingerprint: 'asset1juxtmgjasyr58hp523sn4n24yk0feqga6wxfh9',
        },
        {
          unit: 'f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a000de1406b6c6f73',
          quantity: '1',
          policy: 'f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a',
          name: '\u0000\r�@klos',
          fingerprint: 'asset13ecrex6kefp3fuf3feaemknpm38szh8yla9gaq',
        },
        {
          unit: 'f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a000de1406e69747069636b6572',
          quantity: '1',
          policy: 'f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a',
          name: '\u0000\r�@nitpicker',
          fingerprint: 'asset1qlenj43ld6lhukm06d077l25pcpwmmnqwpwqyv',
        },
        {
          unit: 'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e3744d494e',
          quantity: '22471977',
          policy: 'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e3',
          name: 'tMIN',
          fingerprint: 'asset1dcspl93vqst7k7fcz2vx4mu6jvq7hsrse7zlpv',
        },
        {
          unit: 'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e374484f534b59',
          quantity: '101',
          policy: 'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e3',
          name: 'tHOSKY',
          fingerprint: 'asset15qks69wv4vk7clnhp4lq7x0rpk6vs0s6exw0ry',
        },
      ] as any;
    });
    initTx.mockImplementation(async () => {
      return await Promise.resolve(protocolParameters);
    });
    buildTx.mockImplementation(async () => {
      const tx = {
        body: () => ({
          fee: () => ({
            to_str: () => 'to_str',
          }),
          to_bytes: () => ({
            toString: () => 'toString',
          }),
        }),
      };
      return await Promise.resolve(tx);
    });

    Route.mockImplementation(({ path, component: Component }) => {
      return <>{path === 'send' ? <Component /> : null}</>;
    });

    return () => {
      createTab.mockReset();
      getAccounts.mockReset();
      getCurrentAccount.mockReset();
      getNetwork.mockReset();
      isValidAddress.mockReset();
      useStoreState.mockReset();
      useStoreActions.mockReset();
      getAdaHandle.mockReset();
      updateRecentSentToAddress.mockReset();
      getAsset.mockReset();
      minAdaRequired.mockReset();
      isValidEthAddress.mockReset();
      getUtxos.mockReset();
      sumUtxos.mockReset();
      valueToAssets.mockReset();
      initTx.mockReset();
      buildTx.mockReset();
      Route.mockReset();
    };
  },
};
type Story = StoryObj<typeof SendStory>;
export default meta;

export const LayoutLight: Story = {
  parameters: {
    colorMode: 'light',
  },
};
export const LayoutDark: Story = {
  parameters: {
    colorMode: 'dark',
  },
};

export const RecentAddressLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Recent address popover', async () => {
      await userEvent.click(
        await canvas.findByPlaceholderText('Address, $handle or Milkomeda'),
      );
    });
  },
  parameters: {
    colorMode: 'light',
  },
};
export const RecentAddressDark: Story = {
  ...RecentAddressLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const AddressSuccessLight: Story = {
  beforeEach: () => {
    useStoreState.mockImplementation((callback: any) => {
      return callback({
        ...store,
        globalModel: {
          sendStore: {
            ...store.globalModel.sendStore,
            txInfo,
            address,
          },
        },
      });
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const AddressSuccessDark: Story = {
  ...AddressSuccessLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const AmountErrorLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Ammount input with error', async () => {
      const amountInput = await canvas.findByPlaceholderText('0.000000');
      await userEvent.type(amountInput, '123123123123');
      await userEvent.click(amountInput.parentElement);
    });
  },
  beforeEach: () => {
    useStoreState.mockImplementation((callback: any) => {
      return callback({
        ...store,
        globalModel: {
          sendStore: {
            ...store.globalModel.sendStore,
            txInfo,
            address,
            fee: { error: 'Transaction not possible' },
          },
        },
      });
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const AmountErrorDark: Story = {
  ...AmountErrorLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const AssetsLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Assets popover', async () => {
      await userEvent.click(await canvas.findByText('+ Assets'));
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const AssetsDark: Story = {
  ...AssetsLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const AssetsEmptyLight: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Asset popover empty', async () => {
      await userEvent.click(await canvas.findByText('+ Assets'));
      await userEvent.type(
        await canvas.findByPlaceholderText('Search policy, asset, name'),
        'asd',
      );
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const AssetsEmptyDark: Story = {
  ...AssetsEmptyLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const AssetsSetQuantityLight: Story = {
  beforeEach: () => {
    useStoreState.mockImplementation((callback: any) => {
      return callback({
        ...store,
        globalModel: {
          sendStore: {
            ...store.globalModel.sendStore,
            txInfo,
            address,
            fee: { error: 'Asset quantity not set' },
            value: {
              ada: '23',
              assets: [
                {
                  unit: '212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995f54657374546f6b656e',
                  quantity: '9',
                  policy:
                    '212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995f',
                  name: 'TestToken',
                  fingerprint: 'asset16cee8gr79j5k4ag5v8wlk5ygg5fjyech5ugykj',
                  decimals: 0,
                },
                {
                  unit: '0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d34e6f6e5371756172654e66743235',
                  quantity: '1',
                  policy:
                    '0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d3',
                  name: 'NonSquareNft25',
                  fingerprint: 'asset15tfh93yjsffr7v9fepepuq2w4scl58eeaszmx7',
                  input: '1',
                  decimals: 0,
                },
              ],
              personalAda: '',
              minAda: '0',
            },
          },
        },
      });
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const AssetsSetQuantityDark: Story = {
  ...AssetsSetQuantityLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const AssetsWithQuantityLight: Story = {
  beforeEach: () => {
    useStoreState.mockImplementation((callback: any) => {
      return callback({
        ...store,
        globalModel: {
          sendStore: {
            ...store.globalModel.sendStore,
            message: '123',
            txInfo,
            tx: '84a5008282582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e0582582092f5bfb3a21075094b37dbec4f487901946771f9b2e9875b7d4b611c5a55014e00018382583900a764bab46dd761e93a7dd0ed0ecbd8bbefffddc5c8c53bcc81956bdf0cce15160241079c27241e3cab535884d0d1aac690b060bd4b8f9556821a015ef3c0a2581c0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d3a14e4e6f6e5371756172654e6674323501581c212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995fa14954657374546f6b656e0282583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a821a0011b0dea1581c212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995fa14954657374546f6b656e0782583900e8fc28480c73486d288074c5ac7660ad0611ae5ce505de194353466961ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a1a705dc0e2021a0002c24d031a03bd4756075820538b6e75ff24315983465942e5a21f63496e3e4506f362ac47c36f9ee1d33f19a0f5a11902a2a1636d73678163313233',
            address,
            fee: { fee: '180813' },
            value: {
              ada: '23',
              assets: [
                {
                  unit: '212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995f54657374546f6b656e',
                  quantity: '9',
                  policy:
                    '212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995f',
                  name: 'TestToken',
                  fingerprint: 'asset16cee8gr79j5k4ag5v8wlk5ygg5fjyech5ugykj',
                  input: '2',
                  decimals: 0,
                },
                {
                  unit: '0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d34e6f6e5371756172654e66743235',
                  quantity: '1',
                  policy:
                    '0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d3',
                  name: 'NonSquareNft25',
                  fingerprint: 'asset15tfh93yjsffr7v9fepepuq2w4scl58eeaszmx7',
                  input: '1',
                  decimals: 0,
                },
              ],
              personalAda: '',
              minAda: '0',
            },
          },
        },
      });
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const AssetsWithQuantityDark: Story = {
  ...AssetsWithQuantityLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const ConfirmTransactionLight: Story = {
  ...AssetsWithQuantityLight,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Confirm popover', async () => {
      await userEvent.click(await canvas.findByTestId('sendBtn'));
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const ConfirmTransactionDark: Story = {
  ...ConfirmTransactionLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const ConfirmTransactionSendingAssetsLight: Story = {
  ...ConfirmTransactionLight,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Confirm popover sending assets', async () => {
      await userEvent.click(await canvas.findByTestId('sendBtn'));
      await userEvent.click(await screen.findByTestId('assetsBtn'));
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const ConfirmTransactionSendingAssetsDark: Story = {
  ...ConfirmTransactionSendingAssetsLight,
  parameters: {
    colorMode: 'dark',
  },
};

export const ConfirmTransactionSendingAssetsUncollapsedLight: Story = {
  ...ConfirmTransactionSendingAssetsLight,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Confirm popover sending assets', async () => {
      await userEvent.click(await canvas.findByTestId('sendBtn'));
      await userEvent.click(await screen.findByTestId('assetsBtn'));
      const assets = await screen.findAllByTestId('asset');
      [...assets].forEach(async asset => {
        await userEvent.click(asset);
      });
    });
  },
  parameters: {
    colorMode: 'light',
  },
};

export const ConfirmTransactionSendingAssetsUncollapsedDark: Story = {
  ...ConfirmTransactionSendingAssetsUncollapsedLight,
  parameters: {
    colorMode: 'dark',
  },
};
