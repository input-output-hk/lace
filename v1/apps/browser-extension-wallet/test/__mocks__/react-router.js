// Can be overridden in tests files with the same approach
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useLocation: jest.fn().mockReturnValue({ pathname: '/' })
}));