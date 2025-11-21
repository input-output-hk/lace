import { Layout, SectionLayout } from '@views/browser/components';
import SimpleView from './SimpleView';
import React from 'react';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { ExperimentName } from '@lib/scripts/types/feature-flags';

export const DAppExplorer: React.FC = () => {
  const posthog = usePostHogClientContext();
  const dappExplorerEnabled = posthog.isFeatureFlagEnabled(ExperimentName.DAPP_EXPLORER);
  return (
    <>
      <Layout noAside>
        <SectionLayout>{dappExplorerEnabled && <SimpleView />}</SectionLayout>
      </Layout>
      <div id={'dAppStore'} />
    </>
  );
};
