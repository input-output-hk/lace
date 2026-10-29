import type { ReactNode } from 'react';

import React from 'react';

import { ProofActivityOverlay } from '../components/ProofActivityOverlay';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const loadGlobalOverlays: ContextualLaceInit<
  ReactNode,
  AvailableAddons
> = () => <ProofActivityOverlay key="midnight-proof-activities" />;
export default loadGlobalOverlays;
