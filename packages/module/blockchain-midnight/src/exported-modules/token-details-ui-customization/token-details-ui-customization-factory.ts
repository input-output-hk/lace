import type { ComponentType, ReactNode } from 'react';

import {
  isForbiddenTokenName,
  isMidnightToken,
} from '@lace-contract/midnight-context';
import { createUICustomisation } from '@lace-lib/util-render';

import type { TokenDetailsUICustomization } from '@lace-contract/app';
import type { MidnightSpecificTokenMetadata } from '@lace-contract/midnight-context';
import type { Token } from '@lace-contract/tokens';

export const createTokenDetailsUICustomization = (
  RecentTransactionsContent: ComponentType<{
    children: ReactNode;
    token: Token<MidnightSpecificTokenMetadata>;
  }>,
  TokenNameAddon?: ComponentType<{
    token: Token<MidnightSpecificTokenMetadata>;
  }>,
) =>
  createUICustomisation<
    TokenDetailsUICustomization<MidnightSpecificTokenMetadata>
  >({
    key: 'midnight',
    uiCustomisationSelector: isMidnightToken,
    getTagConfig: token =>
      token.metadata?.blockchainSpecific.kind === 'shielded'
        ? {
            textTranslationKey: 'midnight.tokens.detail-drawer.shielded-pill',
            textColor: '#FFFFFF',
            background: '#0000FE',
          }
        : undefined,
    RecentTransactionsContent,
    ...(TokenNameAddon && { TokenNameAddon }),
    canEditTokenName: token => !isForbiddenTokenName(token.displayLongName),
  }) as TokenDetailsUICustomization;
