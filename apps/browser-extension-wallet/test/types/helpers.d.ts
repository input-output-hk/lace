declare function assertCalledWithArg(
  fnMock: jest.MockInstance<any, any>,
  argValue: unknown,
  argIndex?: number,
  negate?: boolean
): void;
