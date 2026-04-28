import {
  RecentTransactionsContent,
  TokenNameAddon,
} from '../../components/token-details';

import { createTokenDetailsUICustomization } from './token-details-ui-customization-factory';

export const tokenDetailsUICustomizationReactNative = () =>
  createTokenDetailsUICustomization(RecentTransactionsContent, TokenNameAddon);
