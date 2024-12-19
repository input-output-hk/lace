import { gql } from '@apollo/client';

const defaultPaginationInput = {
  offset: 0,
  limit: 10
};

// eslint-disable-next-line template-tag-spacing
const GET_DAPPS_QUERY = gql`
  query dapps($offset: Int!, $limit: Int!) {
    dapps(offset: $offset, limit: $limit) {
      longDescription
      logo
      projectName
      permissionToAggregate
      screenshots {
        data
      }
      subject
      shortDescription
      link
      containsProfanityWords
      categories {
        name
      }
      companyName
      companyEmail
      companyWebsite
    }
  }
`;

// eslint-disable-next-line template-tag-spacing
const SEARCH_DAPPS_QUERY = gql`
  query SearchDapps($dappName: String, $categoryName: String, $offset: Int!, $limit: Int!) {
    SearchDapps(dappName: $dappName, categoryName: $categoryName, offset: $offset, limit: $limit) {
      longDescription
      logo
      projectName
      permissionToAggregate
      screenshots {
        data
      }
      subject
      shortDescription
      link
      containsProfanityWords
      categories {
        name
      }
      companyName
      companyEmail
      companyWebsite
    }
  }
`;

export { GET_DAPPS_QUERY, SEARCH_DAPPS_QUERY, defaultPaginationInput };
