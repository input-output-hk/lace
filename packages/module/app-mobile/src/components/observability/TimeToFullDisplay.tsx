import { isWeb } from '@lace-lib/ui-toolkit';
import * as Sentry from '@sentry/react-native';
import React from 'react';

type TimeToFullDisplayProps = {
  record: boolean;
};

// The extension tab (Metro web) resolves TimeToFullDisplay.web.tsx instead.
// Keep the isWeb guard: the extension webpack bundles resolve this file but
// stub @sentry/react-native to an empty module, so rendering the namespace
// member there would crash. Direct @sentry/react-native usage instead of
// @lace-lib/observability is a shortcut until the observability contract
// exposes a TTFD abstraction (ADR 22).
export const TimeToFullDisplay = ({ record }: TimeToFullDisplayProps) =>
  isWeb ? null : <Sentry.TimeToFullDisplay record={record} />;
