import { expect } from 'chai';
import consoleManager, { ConsoleLogEntry } from '../utils/consoleManager';

class ConsoleAssert {
  assertNoErrorsInConsole = async () => {
    const logs: ConsoleLogEntry[] = await consoleManager.getLogs();
    const errors: ConsoleLogEntry[] = logs.filter((log) => log.level === 'error');
    expect(errors).is.empty;
  };
}
export default new ConsoleAssert();
