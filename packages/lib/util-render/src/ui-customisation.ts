import type {
  EmptyObject,
  GetTagMetadata,
  Tagged,
  UnwrapTagged,
} from 'type-fest';

type UICustomisationSelector<Params> = Params extends void
  ? EmptyObject
  : {
      uiCustomisationSelector: (params: Params) => boolean;
    };

export type UICustomisation<T extends object, SelectorParams = void> = Tagged<
  T & UICustomisationSelector<SelectorParams> & { key: string },
  'UICustomisation',
  SelectorParams
>;

export type SelectorParameterOfUICustomisation<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  C extends UICustomisation<object, any>,
> = GetTagMetadata<C, 'UICustomisation'>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createUICustomisation = <T extends UICustomisation<object, any>>(
  params: UnwrapTagged<T>,
) => params as T;
