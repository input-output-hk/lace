import { expect } from 'chai';
import consoleManager, { ConsoleLogEntry } from '../utils/consoleManager';

class ConsoleAssert {
  assertNoErrorsInConsole = async () => {
    const logs: ConsoleLogEntry[] = await consoleManager.getLogs();
    const errors: ConsoleLogEntry[] = logs.filter((log) => log.level === 'error');
    expect(errors).is.empty;
  };

  assertLogsAreCollected = async (shouldBeCollected: boolean) => {
    await browser.pause(1000); // some delay to let logs populate
    const logs: ConsoleLogEntry[] = await consoleManager.getLogs();
    if (shouldBeCollected) {
      expect(logs.length).to.be.greaterThan(10);
    } else {
      expect(logs).is.empty;
    }
  };
}
export default new ConsoleAssert();
