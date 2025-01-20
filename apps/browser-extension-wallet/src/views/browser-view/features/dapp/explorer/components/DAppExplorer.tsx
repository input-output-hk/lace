import { Layout, SectionLayout } from '@views/browser/components';
import SimpleView from './SimpleView';
import React from 'react';

export const DAppExplorer: React.FC = () => (
  <>
    <Layout noAside>
      <SectionLayout>
        <SimpleView />
      </SectionLayout>
    </Layout>
    <div id={'dAppStore'} />
  </>
);
