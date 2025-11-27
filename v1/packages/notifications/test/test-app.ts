/* eslint-disable no-magic-numbers */
import { NotificationsClient } from '../src';
import { MockStorage } from './MockStorage';

const controlChannel = 'control.topics';

const userId = '550e8400-e29b-41d4-a716-446655440000';
const storage = new MockStorage(userId);

const log = (...args: unknown[]) => {
  // eslint-disable-next-line no-console
  console.log(new Date().toISOString(), ...args);
};

process.on('exit', (code) => {
  log('Process exiting with code', code);
  log('Storage', storage.getStore());
});

// eslint-disable-next-line max-statements
(async () => {
  log('Starting test app; userId', userId);

  const publishKey = process.env.PUBNUB_PUBLISH_KEY;
  const subscribeKey = process.env.PUBNUB_SUBSCRIBE_KEY;

  if (!publishKey) throw new Error('PUBNUB_PUBLISH_KEY is not set');
  if (!subscribeKey) throw new Error('PUBNUB_SUBSCRIBE_KEY is not set');

  const publishMessage = async (channel: string, message?: Record<string, unknown>) => {
    const url = `https://ps.pndsn.com/publish/${publishKey}/${subscribeKey}/0/${channel}/0`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(
          message || {
            title: 'Test Title',
            body: 'Test Body',
            id: Date.now().toString()
          }
        )
      });

      if (!response.ok) {
        log('Failed to publish message', response.status, response.statusText, await response.text());
        throw new Error(`Failed to publish message ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      log('Error publishing message', error);
      throw error;
    }
  };

  const notificationsClient = new NotificationsClient({
    logger: {
      info: (...args: unknown[]) => log('Info', ...args),
      warn: (...args: unknown[]) => log('Warn', ...args),
      error: (...args: unknown[]) => log('Error', ...args)
    },
    onConnectionStatusChange: (error) => {
      log('onConnectionStatusChange', error);
    },
    onNotification: (notification) => {
      log('onNotification', notification);
    },
    onTopics: (topics) => {
      log('onTopics', topics);
      log('Storage', storage.getStore());
    },
    provider: {
      name: 'PubNub',
      configuration: { skipAuthentication: true, subscribeKey }
    },
    storage
  });

  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    log('Unsubscribing from testId2 (should fail because it is already unsubscribed)');
    await notificationsClient.unsubscribe('testId2');
  } catch (error) {
    log('Error unsubscribing from testId2', error);
  }

  log('Waiting 10 seconds (unplug the network to test the automatic reconnection)');
  await new Promise((resolve) => setTimeout(resolve, 10_000));

  log('Unsubscribing from testId');
  try {
    await notificationsClient.unsubscribe('testId');
    log('Unsubscribed from testId');
  } catch (error) {
    log('Error unsubscribing from testId', error);

    log('Waiting 1 minute (reconnect the network)');
    await new Promise((resolve) => setTimeout(resolve, 60_000));
  }

  await new Promise((resolve) => setTimeout(resolve, 2000));

  log('Subscribing to testId2');
  await notificationsClient.subscribe('testId2');
  log('Subscribed to testId2');

  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    log('Subscribing to testId2 (should fail because it is already subscribed)');
    await notificationsClient.subscribe('testId2');
  } catch (error) {
    log('Error subscribing to testId2', error);
  }

  await new Promise((resolve) => setTimeout(resolve, 2000));

  log('Publishing message to testId2');
  await publishMessage('testId2');
  log('Published message to testId2');

  await new Promise((resolve) => setTimeout(resolve, 2000));

  log('Publishing message to testId (nothing should happen because it is not subscribed)');
  await publishMessage('testId');
  log('Published message to testId');

  await new Promise((resolve) => setTimeout(resolve, 2000));

  log('Updating testId2 channel');
  await publishMessage(controlChannel, {
    action: 'PUT',
    topicId: 'testId2',
    details: {
      autoSubscribe: false,
      chain: 'test',
      name: 'Test Name 2',
      description: 'Test Description 2'
    }
  });
  log('Updated testId2 channel');

  await new Promise((resolve) => setTimeout(resolve, 2000));

  log('Adding testId3 channel');
  await publishMessage(controlChannel, {
    action: 'PUT',
    topicId: 'testId3',
    details: {
      autoSubscribe: true,
      chain: 'test',
      name: 'Test Name 3',
      description: 'Test Description 3'
    }
  });
  log('Added testId3 channel');

  await new Promise((resolve) => setTimeout(resolve, 2000));

  log('Removing testId2 channel');
  await publishMessage(controlChannel, { action: 'DEL', topicId: 'testId2' });
  log('Removed testId2 channel');

  await new Promise((resolve) => setTimeout(resolve, 2000));

  log('Closing notifications client');
  await notificationsClient.close();
  log('Notifications client closed');

  /*
  const pubnub = new PubNub({
    autoNetworkDetection: true,
    subscribeKey,
    userId: `user-${Date.now()}`,
    restore: true,
    heartbeatInterval: 60
  });

  pubnub.addListener({
    message: (messageEvent: PubNub.MessageEvent) => {
      log('messageEvent', messageEvent);
    },
    status: (statusEvent: PubNub.StatusEvent) => {
      log('statusEvent', statusEvent);
    }
  });

  const { data: channels } = await pubnub.objects.getAllChannelMetadata({
    include: { customFields: true }
  });

  if (channels.some((channel) => channel.id === 'testId')) {
    pubnub.subscribe({ channels: ['testId'] });
    log('Subscribed to testId');
  } else log('Channel testId not found');

  await new Promise((resolve) => setTimeout(resolve, 2000));

  log(await publishMessage('testId'));

  await new Promise((resolve) => setTimeout(resolve, 5000));

  if (channels.some((channel) => channel.id === 'testId2')) {
    pubnub.subscribe({ channels: ['testId2'] });
    log('Subscribed to testId2');
  } else log('Channel testId2 not found');

  await new Promise((resolve) => setTimeout(resolve, 2000));

  log(await publishMessage('testId2'));

  await new Promise((resolve) => setTimeout(resolve, 10_000));

  pubnub.stop();

  log('PubNub stopped');

  await new Promise((resolve) => setTimeout(resolve, 10_000));
  */
})().catch((error) => log('Error in test app', error));
