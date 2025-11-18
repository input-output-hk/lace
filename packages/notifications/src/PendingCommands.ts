import { Topic } from './types';
import { NotificationsProvider } from './providers';

/**
 * Type representing the available command types for subscription operations.
 */
export type Commands = 'subscribe' | 'unsubscribe';

/**
 * Interface representing a pending command to be executed when connection is restored.
 */
interface Command {
  /** The topic identifier for the command. */
  topicId: Topic['id'];
  /** The type of command to execute. */
  type: Commands;
}

/**
 * Class that manages pending subscription/unsubscription commands.
 * Commands must be enqueued by the caller and removed from the queue after they have been successfully executed.
 * This ensures that commands remaining in the queue are those that failed and will be retried when the connection is restored.
 */
export class PendingCommands {
  /** Map storing pending commands with their corresponding done callbacks. */
  private commands: Map<() => void, Command> = new Map();

  /**
   * Creates a new instance of PendingCommands.
   * @param provider - The notifications provider used to execute commands.
   */
  constructor(private provider: NotificationsProvider) {}

  /**
   * Adds a pending command to the queue.
   * @param type - The type of command ('subscribe' or 'unsubscribe').
   * @param topicId - The identifier of the topic to subscribe or unsubscribe.
   * @returns The done function that must be called to remove the command from the queue.
   */
  add(type: Commands, topicId: Topic['id']): () => void {
    const done = () => {
      this.commands.delete(done);
    };

    this.commands.set(done, { topicId, type });

    return done;
  }

  /**
   * Executes all pending commands when the connection is restored.
   * Iterates through all queued commands and executes them using the provider.
   * Commands are removed from the queue after successful execution.
   */
  onConnectionRestored(): void {
    const commands = [...this.commands.entries()];

    for (const [done, { topicId, type }] of commands)
      (type === 'subscribe' ? this.provider.subscribe(topicId) : this.provider.unsubscribe(topicId))
        // eslint-disable-next-line promise/no-callback-in-promise
        .then(done)
        .catch(() => void 0);
  }
}
