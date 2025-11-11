/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
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
const PUBLISH_KEY = process.env.PUBNUB_PUBLISH_KEY;
const USER_ID = process.env.PUBNUB_PUBLISH_USER_ID;
const CHANNEL = 'data.lace-wallet';
const PUBNUB_BASE_URL = 'https://ps.pndsn.com';
const PUBLISH_ENDPOINT = '/publish';
const JSON_INDENT = 2;

// Get message from command line arguments
// eslint-disable-next-line no-magic-numbers
const message = process.argv.slice(2).join(' ') || 'Test notification';

if (!PUBLISH_KEY || !USER_ID || !SUBSCRIBE_KEY) {
  throw new Error(
    'PUBNUB_PUBLISH_KEY, PUBNUB_PUBLISH_USER_ID and PUBNUB_SUBSCRIBE_KEY environment variables are required'
  );
}

console.log(`Using User ID: ${USER_ID}`);
console.log(`Publishing message: "${message}"`);

interface TokenResponse {
  token: string;
}

/**
 * Requests a publish token from the PubNub token endpoint
 */
const requestPublishToken = async function requestPublishToken(): Promise<string> {
  const url = `${PUBNUB_BASE_URL}/v1/blocks/sub-key/${SUBSCRIBE_KEY}/token/publisher`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      publisherId: USER_ID,
      publisherKey: PUBLISH_KEY
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to get publish token: ${response.status} ${response.statusText} - ${errorText}. Request URL: ${url}`
    );
  }

  const responseData: TokenResponse = await response.json();
  console.log('Token response:', JSON.stringify(responseData, undefined, JSON_INDENT));
  return responseData.token;
};

/**
 * Publishes a message to the PubNub channel using HTTP REST API
 */
const publishMessage = async function publishMessage(token: string): Promise<void> {
  const messageId = uuidv4();
  const url = `${PUBNUB_BASE_URL}${PUBLISH_ENDPOINT}/${PUBLISH_KEY}/${SUBSCRIBE_KEY}/0/${CHANNEL}/0?auth=${encodeURIComponent(
    token
  )}`;

  const messagePayload = {
    title: message,
    body: message,
    id: messageId
  };

  console.log(`Publishing to URL: ${url}`);
  console.log('Payload:', JSON.stringify(messagePayload, undefined, JSON_INDENT));
  console.log('Token:', token);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(messagePayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to publish message: ${response.status} ${response.statusText} - ${errorText}. Request URL: ${url}`
    );
  }

  const responseData = await response.json();
  console.log('✅ Message published successfully!');
  console.log('Response:', JSON.stringify(responseData, undefined, JSON_INDENT));
};

/**
 * Main function to publish a message
 */
const main = async function main(): Promise<void> {
  try {
    console.log('Requesting publish token...');
    const token = await requestPublishToken();
    console.log('Token received successfully:', token);

    console.log('Publishing message...');
    await publishMessage(token);
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Run the script
main();
