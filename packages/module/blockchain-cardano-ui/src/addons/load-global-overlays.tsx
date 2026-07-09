import type { ReactNode } from 'react';

import React from 'react';

import { HdSyncOverlay } from '../components/HdSyncOverlay';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const loadGlobalOverlays: ContextualLaceInit<
  ReactNode,
  AvailableAddons
> = () => <HdSyncOverlay key="hd-sync-overlay" />;

export default loadGlobalOverlays;
