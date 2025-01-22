import { Layout, SectionLayout } from '@views/browser/components';
import SimpleView from './SimpleView';
import React from 'react';
import { ExperimentName } from '@providers/ExperimentsProvider/types';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';

export const DAppExplorer: React.FC = () => {
  const posthog = usePostHogClientContext();
  const dappExplorerEnabled = posthog.isFeatureEnabled(ExperimentName.DAPP_EXPLORER);
  return (
    <>
      <Layout noAside>
        <SectionLayout>{dappExplorerEnabled && <SimpleView />}</SectionLayout>
      </Layout>
      <div id={'dAppStore'} />
    </>
  );
};
