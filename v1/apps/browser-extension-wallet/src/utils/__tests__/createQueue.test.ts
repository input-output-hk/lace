/* eslint-disable @typescript-eslint/no-explicit-any */
import { createQueue, TaskQueue } from '../taskQueue';

describe('createQueue', () => {
  let queue: TaskQueue;
  const batchTasks = 4;
  const intervalBetweenBatch = 100;
  beforeEach(() => {
    queue = createQueue(batchTasks, intervalBetweenBatch);
  });

  it('should enqueue and dequeue tasks correctly', async () => {
    const mockTask = jest.fn();
    // The first task will be picked up and executed immediately
    queue.enqueue(mockTask);
    queue.enqueue(mockTask);

    expect(queue.isEmpty()).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(queue.isEmpty()).toBe(true);
  });

  it('should drain the queue after stopping', () => {
    const mockTask = jest.fn();
    queue.enqueue(mockTask);
    queue.stop();
    expect(queue.isEmpty()).toBe(true);
  });

  it('should execute tasks with rate limiting', async () => {
    const mockTask1 = jest.fn();
    const mockTask2 = jest.fn();
    const mockTask3 = jest.fn();
    const mockTask4 = jest.fn();
    const mockTask5 = jest.fn();
    const mockTask6 = jest.fn();

    queue.enqueue(mockTask1);
    queue.enqueue(mockTask2);
    queue.enqueue(mockTask3);
    queue.enqueue(mockTask4);
    queue.enqueue(mockTask5);
    queue.enqueue(mockTask6);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockTask1).toHaveBeenCalled();
    expect(mockTask2).toHaveBeenCalled();
    expect(mockTask3).toHaveBeenCalled();
    expect(mockTask4).toHaveBeenCalled();

    expect(mockTask5).not.toHaveBeenCalled();
    expect(mockTask6).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, intervalBetweenBatch));

    expect(mockTask5).toHaveBeenCalled();
    expect(mockTask6).toHaveBeenCalled();
  });

  it('should handle stopping the queue', async () => {
    const mockTask1 = jest.fn();
    const mockTask2 = jest.fn();
    const mockTask3 = jest.fn();
    const mockTask4 = jest.fn();
    const mockTask5 = jest.fn();
    const mockTask6 = jest.fn();

    queue.enqueue(mockTask1);
    queue.enqueue(mockTask2);
    queue.enqueue(mockTask3);
    queue.enqueue(mockTask4);
    queue.enqueue(mockTask5);
    queue.enqueue(mockTask6);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockTask1).toHaveBeenCalled();
    expect(mockTask2).toHaveBeenCalled();
    expect(mockTask3).toHaveBeenCalled();
    expect(mockTask4).toHaveBeenCalled();

    queue.stop();

    await new Promise((resolve) => setTimeout(resolve, intervalBetweenBatch));

    expect(mockTask5).not.toHaveBeenCalled();
    expect(mockTask6).not.toHaveBeenCalled();
  });
});
