import { gql } from '@apollo/client';

// eslint-disable-next-line template-tag-spacing
const GET_CATEGORIES = gql`
  {
    categories {
      id
      name
    }
  }
`;

export { GET_CATEGORIES };
