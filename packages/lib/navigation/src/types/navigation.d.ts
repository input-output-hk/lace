import type { StackParameterList } from '.';

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line unicorn/prevent-abbreviations
    interface RootParamList extends StackParameterList {}
  }
}
