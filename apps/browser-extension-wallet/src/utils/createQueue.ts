export const API_LIMIT = 4;
export const API_RATE_LIMIT = 100;

type taskType = () => Promise<unknown>;

interface CreateQueue {
  enqueue: (task: taskType) => void;
  dequeue: () => taskType;
  isEmpty: () => boolean;
  stop: () => void;
}

export const createQueue = (): CreateQueue => {
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
        if (sent >= API_LIMIT) {
          // Reset the sent count
          sent = 0;
          // eslint-disable-next-line promise/avoid-new
          await new Promise((resolve) => setTimeout(resolve, API_RATE_LIMIT));
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
