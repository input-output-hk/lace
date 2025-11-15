import { NotificationsLogger } from './types';

/**
 * Class that manages the connection status and notifies about status changes.
 * Tracks the current connection state and triggers callbacks when the status changes.
 */
export class ConnectionStatus {
  /** Current connection status. */
  private status: 'idle' | 'connecting' | 'connected' | 'error' = 'idle';

  /**
   * Creates a new instance of ConnectionStatus.
   * @param logger - Logger instance for logging messages
   * @param onConnectionStatusChange - Callback function called when the connection status changes. Receives an optional Error parameter if an error occurred.
   */
  constructor(
    private readonly logger: NotificationsLogger,
    private readonly onConnectionStatusChange: (error?: Error) => void
  ) {}

  /**
   * Sets the connection status to error and notifies the callback.
   * @param error - The error that occurred during the connection.
   */
  public setError(err: Error): void {
    setTimeout(() => {
      try {
        this.onConnectionStatusChange(err);
      } catch (error) {
        this.logger.error('Failed to notify connection status change', error);
      }
    }, 0);

    this.status = 'error';
  }

  /**
   * Sets the connection status to connected and notifies the callback if the status was not already connected.
   * Only triggers the callback when transitioning from a non-connected state to connected.
   */
  public setOk(): void {
    if (this.status !== 'connected') {
      setTimeout(() => {
        try {
          this.onConnectionStatusChange();
        } catch (error) {
          this.logger.error('Failed to notify connection status change', error);
        }
      }, 0);

      this.status = 'connected';
    }
  }
}
