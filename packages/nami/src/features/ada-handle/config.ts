/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Cardano } from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';

export const ADA_HANDLE_POLICY_ID = Wallet.ADA_HANDLE_POLICY_ID;
export const isAdaHandleEnabled = process.env.USE_ADA_HANDLE === 'true';
export const HANDLE_SERVER_URLS: Record<Cardano.NetworkMagics, string> = {
  [Cardano.NetworkMagics.Mainnet]: process.env.CARDANO_SERVICES_URL_MAINNET!,
  [Cardano.NetworkMagics.Preprod]: process.env.CARDANO_SERVICES_URL_PREPROD!,
  [Cardano.NetworkMagics.Preview]: process.env.CARDANO_SERVICES_URL_PREVIEW!,
  [Cardano.NetworkMagics.Sanchonet]:
    process.env.CARDANO_SERVICES_URL_SANCHONET!,
};
