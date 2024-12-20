import React from 'react';
import { ApolloClient, InMemoryCache, ApolloProvider, HttpLink } from '@apollo/client';
import { offsetLimitPagination } from '@apollo/client/utilities';

const getApolloGraphqlClient = (): ApolloClient<unknown> => {
  const apiUrl = `${process.env.NEXT_PUBLIC_DAPP_STORE_API_URL}/graphql`;

  return new ApolloClient({
    link: new HttpLink({
      uri: apiUrl
    }),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            dapps: offsetLimitPagination(),
            // Results belong to the same list only if both the dappName
            // and categoryName arguments match exactly
            SearchDapps: offsetLimitPagination(['dappName', 'categoryName'])
          }
        }
      }
    })
  });
};

const withApolloGraphqlClient = (Component: React.ComponentType): React.FC =>
  function innerWithApolloGraphqlClient(props) {
    return (
      <ApolloProvider client={getApolloGraphqlClient()}>
        <Component {...props} />
      </ApolloProvider>
    );
  };

export { getApolloGraphqlClient, withApolloGraphqlClient };
