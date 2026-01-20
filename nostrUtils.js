/**
 * Nostr Utilities for Currency Publishers
 *
 * Shared functions for publishing events to Nostr relays.
 */

const WebSocket = require('ws');
global.WebSocket = WebSocket;
const { SimplePool, finalizeEvent } = require('nostr-tools');

// Shared pool instance
let pool = null;

/**
 * Initialize the Nostr pool
 */
function initPool() {
  if (!pool) {
    pool = new SimplePool();
  }
  return pool;
}

/**
 * Publish a signed event to Nostr relay
 */
async function publishEventToNostr(event, config) {
  const { relay, privateKey } = config;

  const privateKeyBytes = hexToBytes(privateKey);
  const signedEvent = finalizeEvent(event, privateKeyBytes);

  console.log(`[${new Date().toISOString()}] Publishing event to ${relay.url}`);
  console.log('Event ID:', signedEvent.id);
  console.log('Public Key:', signedEvent.pubkey);

  await Promise.race([
    pool.publish([relay.url], signedEvent),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Publish timeout')), relay.publishTimeout)
    )
  ]);

  console.log(`[${new Date().toISOString()}] ✓ Successfully published to Nostr relay`);

  return signedEvent;
}

/**
 * Publish fiat currency rates to Nostr relay
 */
async function publishFiatRatesToNostr(ratesData, config) {
  const { fiat } = config;

  try {
    const content = {
      baseCurrency: fiat.baseCurrency,
      rates: ratesData.rates,
      updatedAt: new Date().toISOString(),
      source: new URL(fiat.api).hostname
    };

    const event = {
      kind: 30078,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['d', fiat.nostrDTag],
        ...fiat.nostrTTags.map(tag => ['t', tag]),
        ['L', 'currency'],
        ['l', fiat.baseCurrency, 'currency'],
        ...fiat.currencies.map(curr => ['l', curr, 'currency'])
      ],
      content: JSON.stringify(content)
    };

    await publishEventToNostr(event, config);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ✗ Failed to publish to Nostr:`, error.message);
    throw error;
  }
}

/**
 * Publish Bitcoin rate to Nostr relay
 */
async function publishBitcoinRateToNostr(ratesData, config) {
  const { bitcoin } = config;

  try {
    const content = {
      baseCurrency: bitcoin.baseCurrency,
      rates: ratesData,
      updatedAt: new Date().toISOString(),
      source: new URL(bitcoin.api).hostname
    };

    const event = {
      kind: 30078,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['d', bitcoin.nostrDTag],
        ...bitcoin.nostrTTags.map(tag => ['t', tag]),
        ['L', 'currency'],
        ['l', bitcoin.baseCurrency, 'currency'],
        ['l', bitcoin.quoteCurrency, 'currency']
      ],
      content: JSON.stringify(content)
    };

    await publishEventToNostr(event, config);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ✗ Failed to publish to Nostr:`, error.message);
    throw error;
  }
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex) {
  if (typeof hex !== 'string') {
    throw new Error('hex must be a string');
  }
  hex = hex.replace(/^0x/, '');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Cleanup - close pool connections
 */
function cleanup(relayUrl) {
  if (pool) {
    pool.close([relayUrl]);
  }
}

module.exports = {
  initPool,
  publishEventToNostr,
  publishFiatRatesToNostr,
  publishBitcoinRateToNostr,
  cleanup
};
