import { Bitcoin } from './chains/bitcoin';
import { Cardano } from './chains/cardano';
import { Midnight } from './chains/midnight';
import Keystone from './Keystone';
import Ledger from './Ledger';
import { Banxa, BanxaFull } from './logos/banxa';
import { Dust } from './logos/dust';
import SeedSigner from './SeedSigner';
import Trezor from './Trezor';

import type { SvgProps } from 'react-native-svg';

export interface CustomIconProps extends SvgProps {
  size?: number;
}

export const Logos = {
  Banxa,
  BanxaFull,
  Keystone,
  Ledger,
  Trezor,
  SeedSigner,
  Dust,
};

export const Blockchains = {
  Cardano,
  Midnight,
  Bitcoin,
};

export const CustomIcons = {
  ...Logos,
  ...Blockchains,
};

export type CustomIconName = keyof typeof CustomIcons;

export type BlockchainIconName = keyof typeof Blockchains;

export type LogoIconName = keyof typeof Logos;
