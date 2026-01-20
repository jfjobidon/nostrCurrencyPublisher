#!/usr/bin/env node

/**
 * Currency Publisher Controller for Splitstr
 *
 * Schedules and runs both fiat and Bitcoin rate publishers:
 * - Fiat currencies: Every 15 minutes (1:00, 1:15, 1:30, 1:45, etc.) --> see config.js
 * - Bitcoin: Every hour (1:00, 2:00, 3:00, etc.)  --> see config.js
 */

require('dotenv').config();
const config = require('./config');
const fiatPublisher = require('./currency-rate-publisher');
const bitcoinPublisher = require('./bitcoin-rate-publisher');

const { relay, fiat } = config;
const RELAY_URL = process.env.RELAY_URL || relay.url;

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
 * Run scheduled updates
 */
async function runScheduledUpdates() {
  // Always run fiat (every 15 minutes)
  await fiatPublisher.run();

  // Only run Bitcoin on the hour
  if (isOnTheHour()) {
    await bitcoinPublisher.run();
  }
}

/**
 * Main entry point
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Currency Publisher Started');
  console.log('='.repeat(60));
  console.log('Relay:', RELAY_URL);
  console.log('Fiat currencies:', [fiat.baseCurrency, ...fiat.currencies].join(', '));
  console.log('Fiat schedule: Every 15 minutes');
  console.log('Bitcoin schedule: Every hour');
  console.log('='.repeat(60) + '\n');

  // Run both immediately on start
  await fiatPublisher.run();
  await bitcoinPublisher.run();

  // Schedule next run at the next quarter hour
  const msToNextQuarter = msUntilNextQuarter();
  console.log(`Next update scheduled in ${Math.round(msToNextQuarter / 1000 / 60)} minutes\n`);

  setTimeout(async () => {
    await runScheduledUpdates();
    // Then run every 15 minutes
    setInterval(runScheduledUpdates, 15 * 60 * 1000);
  }, msToNextQuarter);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nShutting down gracefully...');
  process.exit(0);
});

// Start
main();
