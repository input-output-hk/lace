/**
 * Defines the interface for a scheduler that controls the execution rate of
 * asynchronous tasks.
 */
export type RateLimiter = {
  /**
   * Schedules an asynchronous task to be executed according to the limiter's strategy.
   *
   * @template T The return type of the promise returned by the task.
   * @param task A function that returns a `Promise`. This function encapsulates the
   * work to be executed.
   * @returns A `Promise` that resolves with the result of the task once it has been
   * executed by the scheduler.
   */
  schedule: <T>(task: () => Promise<T>) => Promise<T>;
};
