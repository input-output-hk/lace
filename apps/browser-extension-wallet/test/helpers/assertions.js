/**
 * Asserts that a mock function was called with an argument
 */
global.assertCalledWithArg = (fnMock, argValue, argIndex = 0) => {
  const callFound = fnMock.mock.calls.find((callArgs) => callArgs[argIndex] === argValue);
  expect(callFound ? callFound[argIndex] : fnMock.mock.calls).toBe(argValue);
};
