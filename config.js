/**
 * Configuration for Currency Rate Publishers
 */

const appName = process.env.APP_NAME || 'app';

module.exports = {
  // Nostr relay configuration
  relay: {
    url: process.env.RELAY_URL || 'ws://localhost:8080',
    publishTimeout: 10000,
    eventKind: 30078  // REVIEW: should we use different event kind ? 30079 for fiat and 30080 for bitcoin ?
  },

  // Fiat currency configuration
  fiat: {
    api: 'https://api.frankfurter.app/latest',
    baseCurrency: 'USD',
    currencies: ['EUR', 'CAD', 'GBP', 'JPY', 'CNY', 'MXN'],
    schedule: 60 * 60 * 1000, // 1 hour in ms
    nostrDTag: `${appName}-currency-rates`,
    nostrTTags: [appName, 'currency-rates']
  },

  // Bitcoin configuration
  bitcoin: {
    api: 'https://blockchain.info/ticker',
    baseCurrency: 'BTC',
    quoteCurrency: 'USD',
    schedule: 15 * 60 * 1000, // 15 minutes in ms
    nostrDTag: `${appName}-bitcoin-rates`,
    nostrTTags: [appName, 'bitcoin-rates']
  }
};
