import { gql } from '@apollo/client';

const GET_CATEGORIES = gql`
  {
    categories {
      id
      name
    }
  }
`;

export { GET_CATEGORIES };
