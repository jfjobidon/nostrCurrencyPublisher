/**
 * Configuration for Currency Rate Publishers
 */

module.exports = {
  // Nostr relay configuration
  relay: {
    url: 'ws://localhost:8080',
    publishTimeout: 10000
  },

  // Fiat currency configuration
  fiat: {
    api: 'https://api.frankfurter.app/latest',
    baseCurrency: 'USD',
    currencies: ['EUR', 'CAD', 'GBP', 'JPY', 'CNY', 'MXN'],
    schedule: 60 * 60 * 1000, // 1 hour in ms
    nostrDTag: 'splitstr-currency-rates',
    nostrTTags: ['splitstr', 'currency-rates']
  },

  // Bitcoin configuration
  bitcoin: {
    api: 'https://blockchain.info/ticker',
    baseCurrency: 'BTC',
    quoteCurrency: 'USD',
    schedule: 15 * 60 * 1000, // 15 minutes in ms
    nostrDTag: 'splitstr-bitcoin-rates',
    nostrTTags: ['splitstr', 'bitcoin-rates']
  }
};
