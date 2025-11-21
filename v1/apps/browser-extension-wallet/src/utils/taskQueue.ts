type taskType = () => Promise<unknown>;

export interface TaskQueue {
  enqueue: (task: taskType) => void;
  dequeue: () => taskType;
  isEmpty: () => boolean;
  stop: () => void;
}

export const createQueue = (batchTasks: number, intervalBetweenBatch: number): TaskQueue => {
  let tasks: Array<taskType> = [];
  let isRunning = false;
  let sent = 0;

  const stop = () => {
    sent = 0;
    isRunning = false;
    tasks = [];
  };

  const isEmpty = () => tasks.length === 0;

  const dequeue = (): taskType | undefined => tasks.shift();

  const execute = async () => {
    if (!isEmpty()) {
      const task = dequeue();

      if (!task) {
        return;
      }

      await task();
      sent++;

      if (isRunning && !isEmpty()) {
        if (sent >= batchTasks) {
          // Reset the sent count
          sent = 0;
          await new Promise((resolve) => setTimeout(resolve, intervalBetweenBatch));
        }
        execute();
      }

      if (isEmpty()) {
        stop();
      }
    }
  };

  const enqueue = (item: taskType) => {
    tasks.push(item);

    if (!isRunning) {
      isRunning = true;
      execute();
    }
  };

  return {
    enqueue,
    dequeue,
    isEmpty,
    stop
  };
};
