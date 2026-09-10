import type { ReactNode } from 'react';

import React from 'react';

import { MigrateWalletWizard } from '../components/MigrateWalletWizard';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const loadGlobalOverlays: ContextualLaceInit<
  ReactNode,
  AvailableAddons
> = () => <MigrateWalletWizard key="migrate-wallet-wizard" />;

export default loadGlobalOverlays;
