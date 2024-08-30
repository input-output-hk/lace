import * as React from 'react';
import { withApolloGraphqlClient } from './services/helpers/apollo-graphql-client';
import SimpleViewContent from '@views/browser/features/dapp/explorer/components/SimpleView/SimpleViewContent';

const App = () => <SimpleViewContent selectedCategory={''} search={''} />;

export default withApolloGraphqlClient(App);
