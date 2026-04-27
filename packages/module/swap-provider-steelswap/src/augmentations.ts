import '@lace-contract/module';

declare module '@lace-contract/module' {
  interface AppConfig {
    steelswapApiBaseUrl: string;
    nftCdnUrl: string;
  }
}
