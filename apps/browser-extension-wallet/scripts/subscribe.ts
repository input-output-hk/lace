/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
const PubNub = require('pubnub');
const path = require('path');
const dotenvDefaults = require('dotenv-defaults');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
dotenvDefaults.config({
  path: path.join(__dirname, '../.env'),
  encoding: 'utf8',
  defaults: path.join(__dirname, '../.env.defaults')
});

const SUBSCRIBE_KEY = process.env.PUBNUB_SUBSCRIBE_KEY;
const USER_ID = process.env.PUBNUB_USER_ID || uuidv4();
const CHANNEL = 'data.lace-wallet';
const JSON_INDENT = 2;

if (!SUBSCRIBE_KEY) {
  throw new Error('PUBNUB_SUBSCRIBE_KEY environment variable is required');
}

console.log(`Using User ID: ${USER_ID}`);

/**
 * Requests a subscriber token from the PubNub token endpoint
 */
const requestSubscriberToken = async function requestSubscriberToken(): Promise<string> {
  const url = `https://ps.pndsn.com/v1/blocks/sub-key/${SUBSCRIBE_KEY}/token/subscriber`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: USER_ID
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to get subscriber token: ${response.status} ${response.statusText} - ${errorText}. Request URL: ${url}`
    );
  }

  const data = (await response.json()) as { token: string };
  return data.token;
};

/**
 * Main function to subscribe to the PubNub channel
 */
const main = async function main(): Promise<void> {
  try {
    console.log('Requesting subscriber token...');
    const token = await requestSubscriberToken();
    console.log('Token received successfully');

    console.log('Initializing PubNub...');
    const pubnub = new PubNub({
      subscribeKey: SUBSCRIBE_KEY,
      userId: USER_ID,
      authKey: token
    });

    // Add listener for messages
    pubnub.addListener({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      message: (messageEvent: any) => {
        console.log('\n=== Message Received ===');
        console.log('Channel:', messageEvent.channel);
        console.log('Message:', JSON.stringify(messageEvent.message, undefined, JSON_INDENT));
        console.log('Publisher:', messageEvent.publisher);
        console.log('Subscription:', messageEvent.subscription);
        console.log('Timestamp:', messageEvent.timetoken);
        console.log('========================\n');
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: (statusEvent: any) => {
        switch (statusEvent.category) {
          case 'PNConnectedCategory':
            console.log('✅ Successfully connected to PubNub');
            break;
          case 'PNReconnectedCategory':
            console.log('🔄 Reconnected to PubNub');
            break;
          case 'PNDisconnectedCategory':
            console.log('❌ Disconnected from PubNub');
            break;
          case 'PNUnknownCategory':
            console.log('⚠️  Unknown status:', statusEvent);
            break;
          default:
            console.log('Status:', statusEvent.category, statusEvent);
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      presence: (presenceEvent: any) => {
        console.log('Presence event:', presenceEvent);
      }
    });

    console.log(`Subscribing to channel: ${CHANNEL}...`);
    await pubnub.subscribe({
      channels: [CHANNEL]
    });

    console.log(`✅ Successfully subscribed to ${CHANNEL}`);
    console.log('Listening for messages... (Press Ctrl+C to exit)\n');

    // Keep the process alive
    process.on('SIGINT', () => {
      // console.log('\n\nUnsubscribing...');
      // pubnub.unsubscribe({
      //   channels: [CHANNEL]
      // });
      // pubnub.destroy();
      console.log('Goodbye!');
      // eslint-disable-next-line no-process-exit
      process.exit(0);
    });
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Run the script
main();
