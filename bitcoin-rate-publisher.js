#!/usr/bin/env node

/**
 * Bitcoin Rate Publisher for Splitstr
 *
 * Fetches BTC/USD rate from Blockchain.info API every 15 minutes
 * and publishes it to a Nostr relay as kind 30078 events.
 */

require('dotenv').config();
const https = require('https');
const WebSocket = require('ws');
global.WebSocket = WebSocket;
const { SimplePool, finalizeEvent } = require('nostr-tools');
const config = require('./config');

// Configuration from config file
const { relay, bitcoin } = config;

// Private key for signing (should be stored securely - use environment variable)
const PRIVATE_KEY = process.env.NOSTR_PRIVATE_KEY || 'YOUR_PRIVATE_KEY_HEX';

// Initialize Nostr pool
const pool = new SimplePool();

/**
 * Fetch Bitcoin rate from Blockchain.info API
 */
async function fetchBitcoinRate() {
  return new Promise((resolve, reject) => {
    console.log(`[${new Date().toISOString()}] Fetching BTC rate from: ${bitcoin.api}`);

    https.get(bitcoin.api, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const rate = parsed[bitcoin.quoteCurrency].last;
          console.log(`[${new Date().toISOString()}] Successfully fetched BTC/${bitcoin.quoteCurrency} rate:`, rate);
          resolve({ [bitcoin.quoteCurrency]: rate });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`HTTP request failed: ${error.message}`));
    });
  });
}

/**
 * Create and publish Nostr event with Bitcoin rate
 */
async function publishBitcoinRateToNostr(ratesData) {
  try {
    // Prepare the content
    const content = {
      baseCurrency: bitcoin.baseCurrency,
      rates: ratesData,
      updatedAt: new Date().toISOString(),
      source: new URL(bitcoin.api).hostname
    };

    // Create the event (unsigned)
    let event = {
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

    // Sign the event
    const privateKeyBytes = hexToBytes(PRIVATE_KEY);
    event = finalizeEvent(event, privateKeyBytes);

    console.log(`[${new Date().toISOString()}] Publishing event to ${relay.url}`);
    console.log('Event ID:', event.id);
    console.log('Public Key:', event.pubkey);

    // Publish to relay
    await Promise.race([
      pool.publish([relay.url], event),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Publish timeout')), relay.publishTimeout)
      )
    ]);

    console.log(`[${new Date().toISOString()}] ✓ Successfully published to Nostr relay`);

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

  // Remove '0x' prefix if present
  hex = hex.replace(/^0x/, '');

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Main execution function
 */
async function run() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log(`[${new Date().toISOString()}] Starting Bitcoin rate update...`);
    console.log('='.repeat(60));

    // Validate private key
    if (!PRIVATE_KEY || PRIVATE_KEY === 'YOUR_PRIVATE_KEY_HEX') {
      throw new Error('NOSTR_PRIVATE_KEY environment variable not set! Please set it before running.');
    }

    // Fetch rate
    const ratesData = await fetchBitcoinRate();

    // Publish to Nostr
    await publishBitcoinRateToNostr(ratesData);

    console.log('='.repeat(60));
    console.log(`[${new Date().toISOString()}] ✓ Update completed successfully`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error(`[${new Date().toISOString()}] ✗ Error:`, error.message);
    console.error('='.repeat(60) + '\n');
    process.exit(1);
  }
}

module.exports = { fetchBitcoinRate, publishBitcoinRateToNostr, run };
