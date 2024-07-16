type StateObject = Record<string, unknown>;

type ShapeConfig = {
  constantDataPart?: StateObject;
  mainPart: StateObject;
  variableDataPart?: StateObject;
};

type IntersectIfSecondPresent<
  Present extends StateObject,
  MaybePresent extends StateObject | undefined,
> = MaybePresent extends StateObject ? Present & MaybePresent : Present;

type ValuesNullable<T extends StateObject | undefined> = Record<keyof T, T[keyof T] | undefined>;

export const defineStateShape =
  <Config extends ShapeConfig>() =>
  <S extends IntersectIfSecondPresent<Config['mainPart'], ValuesNullable<Config['variableDataPart']>>>() =>
  (state: IntersectIfSecondPresent<S, Config['constantDataPart']>) =>
    state;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StateHelper = (state: any) => any;

export type StateType<T extends StateHelper> = ReturnType<T>;

export type TransitionHandler<
  CurrentState extends StateObject,
  TargetState extends StateObject,
  A extends { type: string },
> = (
  prevState: CurrentState extends StateHelper ? StateType<StateHelper> : CurrentState,
  action: A,
) => TargetState extends StateHelper ? StateType<StateHelper> : TargetState;
