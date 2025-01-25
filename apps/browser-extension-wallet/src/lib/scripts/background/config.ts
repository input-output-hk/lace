import axiosFetchAdapter from '@shiroyasha9/axios-fetch-adapter';
import { Wallet } from '@lace/cardano';
import { RemoteApiProperties, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { getBaseUrlForChain, getMagicForChain } from '@src/utils/chain';
import { BackgroundService, UserIdService as UserIdServiceInterface } from '../types';
import { getBackgroundStorage } from '@lib/scripts/background/storage';
import { ExperimentName } from '@providers/ExperimentsProvider/types';
import { logger } from '@lace/common';
import { config } from '@src/config';
import Bottleneck from 'bottleneck';
import { RateLimiter } from '@cardano-sdk/cardano-services-client';

export const backgroundServiceProperties: RemoteApiProperties<BackgroundService> = {
  requestMessage$: RemoteApiPropertyType.HotObservable,
  migrationState$: RemoteApiPropertyType.HotObservable,
  coinPrices: {
    adaPrices$: RemoteApiPropertyType.HotObservable,
    tokenPrices$: RemoteApiPropertyType.HotObservable
  },
  handleOpenBrowser: RemoteApiPropertyType.MethodReturningPromise,
  handleOpenNamiBrowser: RemoteApiPropertyType.MethodReturningPromise,
  handleOpenPopup: RemoteApiPropertyType.MethodReturningPromise,
  handleChangeTheme: RemoteApiPropertyType.MethodReturningPromise,
  handleChangeMode: RemoteApiPropertyType.MethodReturningPromise,
  clearBackgroundStorage: RemoteApiPropertyType.MethodReturningPromise,
  getBackgroundStorage: RemoteApiPropertyType.MethodReturningPromise,
  setBackgroundStorage: RemoteApiPropertyType.MethodReturningPromise,
  resetStorage: RemoteApiPropertyType.MethodReturningPromise,
  backendFailures$: RemoteApiPropertyType.HotObservable,
  unhandledError$: RemoteApiPropertyType.HotObservable
};

const { BLOCKFROST_CONFIGS, BLOCKFROST_RATE_LIMIT_CONFIG } = config();
// Important to use the same rateLimiter object for all networks,
// because Blockfrost rate limit is per IP address, not per project id
export const rateLimiter: RateLimiter = new Bottleneck({
  reservoir: BLOCKFROST_RATE_LIMIT_CONFIG.size,
  reservoirIncreaseAmount: BLOCKFROST_RATE_LIMIT_CONFIG.increaseAmount,
  reservoirIncreaseInterval: BLOCKFROST_RATE_LIMIT_CONFIG.increaseInterval,
  reservoirIncreaseMaximum: BLOCKFROST_RATE_LIMIT_CONFIG.size
});

export const getProviders = async (chainName: Wallet.ChainName): Promise<Wallet.WalletProvidersDependencies> => {
  const baseCardanoServicesUrl = getBaseUrlForChain(chainName);
  const magic = getMagicForChain(chainName);
  const { customSubmitTxUrl, featureFlags } = await getBackgroundStorage();

  const isExperimentEnabled = (experimentName: ExperimentName) => !!(featureFlags?.[magic]?.[experimentName] ?? false);

  return Wallet.createProviders({
    axiosAdapter: axiosFetchAdapter,
    env: {
      baseCardanoServicesUrl,
      customSubmitTxUrl,
      blockfrostConfig: {
        ...BLOCKFROST_CONFIGS[chainName],
        rateLimiter,
        apiVersion: 'v0'
      }
    },
    logger,
    experiments: {
      useDrepProviderOverrideActiveStatus: isExperimentEnabled(ExperimentName.USE_DREP_PROVIDER_OVERRIDE),
      useWebSocket: isExperimentEnabled(ExperimentName.WEBSOCKET_API),
      useBlockfrostAssetProvider: isExperimentEnabled(ExperimentName.BLOCKFROST_ASSET_PROVIDER),
      useBlockfrostChainHistoryProvider: true,
      useBlockfrostNetworkInfoProvider: isExperimentEnabled(ExperimentName.BLOCKFROST_NETWORK_INFO_PROVIDER),
      useBlockfrostRewardsProvider: isExperimentEnabled(ExperimentName.BLOCKFROST_REWARDS_PROVIDER),
      useBlockfrostTxSubmitProvider: isExperimentEnabled(ExperimentName.BLOCKFROST_TX_SUBMIT_PROVIDER),
      useBlockfrostUtxoProvider: isExperimentEnabled(ExperimentName.BLOCKFROST_UTXO_PROVIDER),
      useBlockfrostAddressDiscovery: isExperimentEnabled(ExperimentName.BLOCKFROST_ADDRESS_DISCOVERY),
      useBlockfrostInputResolver: isExperimentEnabled(ExperimentName.BLOCKFROST_INPUT_RESOLVER)
    }
  });
};

export const cip30WalletProperties = {
  // eslint-disable-next-line max-len
  icon: "data:image/svg+xml,%3Csvg width='45' height='45' viewBox='0 0 45 45' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M7.20581 19.7194C6.97849 20.2972 6.78249 20.8867 6.61867 21.4856C5.89494 24.1253 5.77235 26.8937 6.25994 29.5871C6.28266 29.721 6.30896 29.855 6.33766 29.9877C6.4405 30.4971 6.56725 31.0065 6.71553 31.5052C6.87936 32.06 7.07427 32.6185 7.29789 33.1637C8.7964 36.8437 11.4627 39.9293 14.8864 41.9457C15.6873 42.4187 16.5242 42.8281 17.3892 43.1702C20.6506 44.4602 24.2155 44.7792 27.6541 44.0885C31.0927 43.3979 34.258 41.7272 36.7683 39.2778C38.3477 37.7378 39.6295 35.9197 40.5494 33.9147C40.3927 34.0797 40.2313 34.2435 40.0711 34.4038C37.4141 37.0117 34.0672 38.8061 30.4246 39.5756C30.2596 39.6569 30.0922 39.7311 29.9235 39.8052C27.3481 40.9225 24.5061 41.2775 21.735 40.8279C18.9638 40.3784 16.3798 39.1432 14.2897 37.2689C14.0505 37.0561 13.8182 36.8336 13.5926 36.6017L13.4909 36.4952C11.4347 34.3597 10.0778 31.6485 9.60099 28.7226C9.55794 28.4603 9.52167 28.1964 9.49217 27.9309C9.43497 27.4039 9.40583 26.8742 9.40488 26.3441C9.39359 23.459 10.2366 20.6351 11.8276 18.2282C12.2275 17.62 12.6732 17.0431 13.1609 16.5027C13.3666 16.2743 13.5818 16.0471 13.8066 15.8283C16.4992 13.1837 20.1109 11.6838 23.8848 11.643C23.9434 11.643 24.0115 11.643 24.0785 11.643H24.2339C27.4415 11.6683 30.5515 12.7496 33.0828 14.7198C32.9951 14.3953 32.8959 14.0741 32.7851 13.756C32.6954 13.5049 32.6009 13.2597 32.4969 13.017C31.9158 11.6256 31.0986 10.3452 30.0814 9.23227L30.0228 9.18803C29.1693 8.89153 28.2941 8.66125 27.4052 8.49925C25.1046 8.07597 22.7442 8.09749 20.4516 8.56263C19.3778 8.77909 18.3263 9.09412 17.3103 9.50372C16.8212 9.69983 16.3453 9.91507 15.8957 10.1447C14.904 10.6473 13.9608 11.2406 13.0784 11.9168L12.9994 11.9766C12.4412 12.4128 11.9078 12.8799 11.4019 13.3757C10.2717 14.4804 9.29155 15.7287 8.48651 17.0887C8.02665 17.8674 7.62689 18.6801 7.29071 19.5197L7.28114 19.7182L7.20581 19.7194ZM18.1521 5.9534C17.0596 5.95245 15.9692 6.05172 14.8948 6.24996C14.7537 6.27268 14.6174 6.29899 14.481 6.33008C13.9788 6.43292 13.473 6.56086 12.9719 6.71153C12.6802 6.79644 12.3896 6.89091 12.1014 6.99135C11.8132 7.0918 11.5477 7.19464 11.2739 7.30585C7.5843 8.79264 4.49573 11.4672 2.49676 14.9063C2.24206 15.3392 1.99931 15.7948 1.77929 16.26C1.60231 16.6295 1.43609 17.0061 1.28662 17.3828C-0.413844 21.6522 -0.429267 26.4081 1.24347 30.6884C2.91621 34.9687 6.15224 38.4539 10.2969 40.439L10.5481 40.5585C10.3806 40.3995 10.2144 40.2369 10.053 40.0719C7.44279 37.411 5.64753 34.0595 4.87879 30.4122C4.81063 30.2926 4.72334 30.1001 4.63963 29.9064C4.5069 29.6015 4.38732 29.2906 4.27491 28.9725C3.6319 27.1539 3.35445 25.2262 3.45849 23.3001C3.56253 21.374 4.04602 19.4875 4.88118 17.7487C5.16523 17.1562 5.48717 16.5827 5.84499 16.0316C6.24791 15.4151 6.69723 14.8303 7.18907 14.2821C7.4354 14.0059 7.69011 13.7404 7.95796 13.4857C8.45652 13.0044 8.99012 12.5607 9.55435 12.1584C10.4163 11.5414 11.343 11.0202 12.3178 10.6039C14.603 8.86233 17.2524 7.66007 20.0678 7.08702C21.112 6.8698 22.1722 6.73862 23.2379 6.6948L22.9987 6.62544C21.4217 6.1797 19.7909 5.95356 18.1521 5.9534V5.9534ZM21.2325 37.7616L21.4717 37.8273C24.1094 38.5547 26.8767 38.6805 29.5696 38.1957L29.6437 38.1825C29.7633 38.1598 29.8829 38.1383 30.0025 38.1119C30.4975 38.0127 30.9866 37.8883 31.5056 37.7341C32.0246 37.5798 32.5411 37.404 33.0601 37.196L33.2371 37.4351L33.1295 37.1673C35.3219 36.2836 37.3184 34.976 39.0044 33.3192C40.1359 32.2115 41.1179 30.9609 41.9258 29.5991C42.3923 28.8074 42.7973 27.9811 43.1371 27.1274C44.4487 23.8612 44.7818 20.2839 44.0958 16.8317C43.4098 13.3795 41.7342 10.2015 39.2735 7.68491V7.68491C37.7389 6.11162 35.9283 4.83362 33.9319 3.91457C36.1679 6.04959 37.8668 8.68359 38.8896 11.6011C39.1754 12.4129 39.4091 13.2421 39.5892 14.0836C39.6537 14.2032 39.7386 14.3897 39.8188 14.5751C40.2832 15.6624 40.6144 16.8019 40.8053 17.9688C40.9355 18.7637 41.0011 19.5679 41.0014 20.3735C41.007 23.2506 40.1648 26.0655 38.5799 28.4667C38.1801 29.0749 37.734 29.6514 37.2454 30.191C37.0397 30.4206 36.8245 30.6478 36.5997 30.8666L36.4956 30.9647C35.226 32.1895 33.7442 33.1733 32.1226 33.8681C30.5316 35.063 28.7658 36.0052 26.8874 36.6614C26.0713 36.9493 25.2372 37.1838 24.3906 37.3634C23.3504 37.5813 22.2942 37.7149 21.2325 37.7628V37.7616ZM14.3973 35.2504C15.2548 35.5521 16.1343 35.7867 17.0281 35.9523C19.3407 36.3904 21.7171 36.368 24.0211 35.8866C24.8231 35.719 25.6132 35.4989 26.3864 35.2277C26.659 35.132 26.9281 35.0292 27.1912 34.9228C27.6539 34.7362 28.1047 34.5305 28.534 34.3129C31.6453 32.7525 34.2367 30.3223 35.9934 27.3175C36.2457 26.8918 36.4873 26.4362 36.7109 25.9615C36.8807 25.6027 37.0349 25.2512 37.1808 24.8924L37.2012 24.8362C38.4673 21.6854 38.8136 18.2401 38.1997 14.9003V14.892C38.1793 14.7616 38.153 14.6337 38.1243 14.5045C38.0239 14.0071 37.8959 13.4953 37.7417 12.9799C37.6544 12.6869 37.5623 12.3964 37.4595 12.1058C37.365 11.8403 37.2669 11.5784 37.1605 11.3201C35.6856 7.63287 33.0272 4.54032 29.6031 2.52864C29.1415 2.2548 28.668 2.00369 28.1968 1.77888C27.8488 1.61266 27.4985 1.45601 27.1421 1.31491C22.8673 -0.40841 18.0966 -0.438843 13.8002 1.2298C9.50371 2.89845 6.00412 6.14088 4.01303 10.2977C3.97596 10.3755 3.93889 10.4532 3.90302 10.5369C6.03985 8.29653 8.67675 6.59391 11.598 5.56835C12.404 5.28601 13.2267 5.05359 14.0613 4.8724C14.194 4.79946 14.3937 4.70858 14.597 4.62368C14.8852 4.5041 15.1806 4.38452 15.4807 4.28048C16.2996 3.9932 17.1418 3.77716 17.9979 3.63475C21.6437 3.04462 25.3781 3.84571 28.4611 5.87926C29.0651 6.27329 29.6379 6.71304 30.1747 7.19464C30.4425 7.4338 30.7016 7.68212 30.9519 7.93962C32.1751 9.21219 33.1575 10.6958 33.8517 12.3186C33.9821 12.6247 34.1029 12.9333 34.2105 13.2502C34.498 14.0619 34.7133 14.8974 34.8538 15.747C34.9004 16.0112 34.9351 16.2803 34.965 16.5482C35.2664 19.2655 34.7947 22.0127 33.6042 24.4739C33.0016 25.7325 32.2247 26.8999 31.2963 27.9417C29.9367 29.4529 28.2794 30.6668 26.4284 31.5072C24.5774 32.3476 22.5728 32.7964 20.5401 32.8253C19.8147 32.8353 19.0896 32.7901 18.371 32.6902C16.8586 32.4808 15.388 32.037 14.0123 31.3748C13.077 30.9268 12.1909 30.3826 11.3684 29.7509C11.9155 31.8031 12.9543 33.691 14.3949 35.2516L14.3973 35.2504ZM10.963 27.3582C12.0346 28.4496 13.2893 29.3449 14.67 30.0033C14.9777 30.1507 15.2894 30.2859 15.6051 30.4086C13.3915 28.0523 12.0214 25.0287 11.7092 21.8109C11.0674 23.5868 10.813 25.4794 10.963 27.3617V27.3582ZM28.839 14.0382C31.0416 16.3937 32.4128 19.4053 32.7432 22.6132C33.3848 20.8547 33.6417 18.9789 33.4966 17.1126V17.1066C32.1808 15.7632 30.5926 14.7169 28.839 14.0382V14.0382Z' fill='url(%23paint0_radial_7152_190498)'/%3E%3Cdefs%3E%3CradialGradient id='paint0_radial_7152_190498' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(22.219 22.2222) scale(22.2239)'%3E%3Cstop stop-color='%23FDC300'/%3E%3Cstop offset='0.11' stop-color='%23FDC205'/%3E%3Cstop offset='0.25' stop-color='%23FDBF13'/%3E%3Cstop offset='0.39' stop-color='%23FDB92B'/%3E%3Cstop offset='0.54' stop-color='%23FEB24C'/%3E%3Cstop offset='0.7' stop-color='%23FEA977'/%3E%3Cstop offset='0.86' stop-color='%23FF9DAA'/%3E%3Cstop offset='1' stop-color='%23FF92DE'/%3E%3C/radialGradient%3E%3C/defs%3E%3C/svg%3E%0A",
  walletName: process.env.WALLET_NAME
};

export const userIdServiceProperties: RemoteApiProperties<UserIdServiceInterface> = {
  clearId: RemoteApiPropertyType.MethodReturningPromise,
  makePersistent: RemoteApiPropertyType.MethodReturningPromise,
  makeTemporary: RemoteApiPropertyType.MethodReturningPromise,
  extendLifespan: RemoteApiPropertyType.MethodReturningPromise,
  getAliasProperties: RemoteApiPropertyType.MethodReturningPromise,
  getRandomizedUserId: RemoteApiPropertyType.MethodReturningPromise,
  getUserId: RemoteApiPropertyType.MethodReturningPromise,
  userId$: RemoteApiPropertyType.HotObservable,
  isNewSession: RemoteApiPropertyType.MethodReturningPromise,
  resetToDefaultValues: RemoteApiPropertyType.MethodReturningPromise,
  generateWalletBasedUserId: RemoteApiPropertyType.MethodReturningPromise
};
