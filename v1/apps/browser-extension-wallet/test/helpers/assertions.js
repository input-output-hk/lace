/**
 * Asserts that a mock function was called with an argument
 */
global.assertCalledWithArg = (fnMock, argValue, argIndex = 0, negate = false) => {
  const callFound = fnMock.mock.calls.find((callArgs) => callArgs[argIndex] === argValue);
  const expectation = expect(callFound ? callFound[argIndex] : fnMock.mock.calls);
  negate ? expectation.not.toBe(argValue) : expectation.toBe(argValue);
};
