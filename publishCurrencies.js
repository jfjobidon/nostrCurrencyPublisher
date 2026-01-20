#!/usr/bin/env node

/**
 * Currency Publisher Controller for Splitstr
 *
 * Schedules and runs both fiat and Bitcoin rate publishers:
 * - Fiat currencies: Every 15 minutes (1:00, 1:15, 1:30, 1:45, etc.)
 * - Bitcoin: Every hour (1:00, 2:00, 3:00, etc.)
 */

require('dotenv').config();
const configFile = require('./config');
const nostrUtils = require('./nostrUtils');
const { fetchCurrencyRates } = require('./currencyRates');
const { fetchBitcoinRate } = require('./bitcoinRates');

// Build unified config from file and environment
const config = {
  relay: {
    url: process.env.RELAY_URL || configFile.relay.url,
    publishTimeout: configFile.relay.publishTimeout,
    eventKind: configFile.relay.eventKind
  },
  fiat: configFile.fiat,
  bitcoin: configFile.bitcoin,
  privateKey: process.env.NOSTR_PRIVATE_KEY
};

/**
 * Run scheduled updates
 */
async function runScheduledUpdates() {
  // Always run fiat (every 15 minutes)
  await runFiatUpdate();

  // Only run Bitcoin on the hour
  if (isOnTheHour()) {
    await runBitcoinUpdate();
  }
}

/**
 * Main entry point
 */
async function main() {
  // Validate private key
  if (!config.privateKey) {
    console.error('ERROR: NOSTR_PRIVATE_KEY environment variable not set!');
    process.exit(1);
  }

  // Initialize Nostr pool
  nostrUtils.initPool();

  console.log('='.repeat(60));
  console.log('Currency Publisher Started');
  console.log('='.repeat(60));
  console.log('Relay:', config.relay.url);
  console.log('Fiat currencies:', [config.fiat.baseCurrency, ...config.fiat.currencies].join(', '));
  console.log('Fiat schedule: Every 15 minutes');
  console.log('Bitcoin schedule: Every hour');
  console.log('='.repeat(60) + '\n');

  // Run both immediately on start
  await runFiatUpdate();
  await runBitcoinUpdate();

  // Schedule next run at the next quarter hour
  const msToNextQuarter = msUntilNextQuarter();
  console.log(`Next update scheduled in ${Math.round(msToNextQuarter / 1000 / 60)} minutes\n`);

  setTimeout(async () => {
    await runScheduledUpdates();
    // Then run every 15 minutes
    setInterval(runScheduledUpdates, 15 * 60 * 1000);
  }, msToNextQuarter);
}

/**
 * Fetch and publish fiat rates
 */
async function runFiatUpdate() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log(`[${new Date().toISOString()}] Starting FIAT currency rate update...`);
    console.log('='.repeat(60));

    const ratesData = await fetchCurrencyRates(config.fiat);
    await nostrUtils.publishFiatRatesToNostr(ratesData, config);

    console.log('='.repeat(60));
    console.log(`[${new Date().toISOString()}] ✓ FIAT update completed successfully`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error(`[${new Date().toISOString()}] ✗ FIAT Error:`, error.message);
    console.error('='.repeat(60) + '\n');
  }
}

/**
 * Fetch and publish bitcoin rate
 */
async function runBitcoinUpdate() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log(`[${new Date().toISOString()}] Starting BITCOIN rate update...`);
    console.log('='.repeat(60));

    const ratesData = await fetchBitcoinRate(config.bitcoin);
    await nostrUtils.publishBitcoinRateToNostr(ratesData, config);

    console.log('='.repeat(60));
    console.log(`[${new Date().toISOString()}] ✓ BITCOIN update completed successfully`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error(`[${new Date().toISOString()}] ✗ BITCOIN Error:`, error.message);
    console.error('='.repeat(60) + '\n');
  }
}

/**
 * Calculate milliseconds until next quarter hour (0, 15, 30, 45)
 */
function msUntilNextQuarter() {
  const now = new Date();
  const minutes = now.getMinutes();
  const nextQuarter = Math.ceil((minutes + 1) / 15) * 15;
  const nextTime = new Date(now);

  if (nextQuarter >= 60) {
    nextTime.setHours(now.getHours() + 1, 0, 0, 0);
  } else {
    nextTime.setMinutes(nextQuarter, 0, 0);
  }

  return nextTime - now;
}

/**
 * Check if current time is on the hour (minute 0)
 */
function isOnTheHour() {
  return new Date().getMinutes() === 0;
}

/**
 * Graceful shutdown handler
 */
function shutdown() {
  console.log('\n\nShutting down gracefully...');
  nostrUtils.cleanup(config.relay.url);
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start
main();
