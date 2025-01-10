import { Layout, SectionLayout } from '@views/browser/components';
import SimpleView from './SimpleView';
import DappLayout from '../layout/dapp';
import React from 'react';

export const DAppExplorer: React.FC = () => (
  <>
    <Layout noAside>
      <SectionLayout>
        <DappLayout>
          <SimpleView />
        </DappLayout>
      </SectionLayout>
    </Layout>
    <div id={'dAppStore'} />
  </>
);
