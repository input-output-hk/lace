/* eslint-disable camelcase */
import SimpleView from '../../components/SimpleView';
import * as React from 'react';
import { createStore, StateMachineProvider } from 'little-state-machine';
import { Route } from 'react-router-dom';
import DappLayout from '../../layout/dapp';
import { ERoutes } from '../enum';
import Layout from '../../layout';

createStore(
  {
    name: '',
    description: '',
    provider_name: '',
    url: '',
    tagline: '',
    avatar: '',
    email: '',
    features: [],
    categories: []
  },
  {}
);

const DappRoutes: React.FC = () => (
  <Layout>
    <React.Suspense fallback={<></>}>
      <StateMachineProvider>
        <DappLayout>
          <Route exact path={ERoutes.ROOT_ROUTE} component={SimpleView} />
        </DappLayout>
      </StateMachineProvider>
    </React.Suspense>
  </Layout>
);

export default DappRoutes;
