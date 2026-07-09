/* eslint-disable unicorn/prevent-abbreviations */
import type { SheetParameterList } from '.';
declare global {
  namespace ReactNavigation {
    interface RootParamList extends SheetParameterList {}
  }
}
