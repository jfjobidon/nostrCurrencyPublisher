#!/usr/bin/env node

/**
 * Currency Rate Publisher for Splitstr
 *
 * Fetches currency rates from Frankfurter API every hour (on the hour)
 * and publishes them to a Nostr relay as kind 30078 events.
 */

require('dotenv').config();
const https = require('https');
const WebSocket = require('ws');
global.WebSocket = WebSocket;
const { SimplePool, finalizeEvent } = require('nostr-tools');
const config = require('./config');

// Configuration from config file
const { relay, fiat } = config;

// Private key for signing (should be stored securely - use environment variable)
const PRIVATE_KEY = process.env.NOSTR_PRIVATE_KEY || 'YOUR_PRIVATE_KEY_HEX';

// Initialize Nostr pool
const pool = new SimplePool();

/**
 * Fetch currency rates from Frankfurter API
 */
async function fetchCurrencyRates() {
  return new Promise((resolve, reject) => {
    const url = `${fiat.api}?from=${fiat.baseCurrency}&to=${fiat.currencies.join(',')}`;

    console.log(`[${new Date().toISOString()}] Fetching rates from: ${url}`);

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`[${new Date().toISOString()}] Successfully fetched rates:`, parsed.rates);
          resolve(parsed);
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
 * Create and publish Nostr event with currency rates
 */
async function publishRatesToNostr(ratesData) {
  try {
    // Prepare the content
    const content = {
      baseCurrency: fiat.baseCurrency,
      rates: ratesData.rates,
      updatedAt: new Date().toISOString(),
      source: new URL(fiat.api).hostname
    };

    // Create the event (unsigned)
    let event = {
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
    console.log(`[${new Date().toISOString()}] Starting currency rate update...`);
    console.log('='.repeat(60));

    // Validate private key
    if (!PRIVATE_KEY || PRIVATE_KEY === 'YOUR_PRIVATE_KEY_HEX') {
      throw new Error('NOSTR_PRIVATE_KEY environment variable not set! Please set it before running.');
    }

    // Fetch rates
    const ratesData = await fetchCurrencyRates();

    // Publish to Nostr
    await publishRatesToNostr(ratesData);

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

/**
 * Calculate milliseconds until next hour
 */
function msUntilNextHour() {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(now.getHours() + 1, 0, 0, 0);
  return nextHour - now;
}

/**
 * Schedule to run every hour on the hour
 */
function scheduleHourlyRuns() {
  // Run immediately on start
  console.log('Currency Rate Publisher Started');
  console.log('Relay:', relay.url);
  console.log('Currencies:', [fiat.baseCurrency, ...fiat.currencies].join(', '));
  console.log('Source:', fiat.api);
  console.log();

  run();

  // Schedule next run at the top of the next hour
  const msToNextHour = msUntilNextHour();
  console.log(`Next update scheduled in ${Math.round(msToNextHour / 1000 / 60)} minutes`);

  setTimeout(() => {
    run();
    // Then run every hour
    setInterval(run, fiat.schedule);
  }, msToNextHour);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  pool.close([relay.url]);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nShutting down gracefully...');
  pool.close([relay.url]);
  process.exit(0);
});

// Start the scheduler
if (require.main === module) {
  scheduleHourlyRuns();
}

module.exports = { fetchCurrencyRates, publishRatesToNostr };
