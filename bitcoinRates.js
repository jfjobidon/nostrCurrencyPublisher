/**
 * Bitcoin Rates Fetcher for Splitstr
 *
 * Fetches BTC/USD rate from Blockchain.info API.
 */

const https = require('https');

/**
 * Fetch Bitcoin rate from Blockchain.info API
 * @param {Object} bitcoinConfig - Bitcoin configuration from config.js
 * @returns {Promise<Object>} - Rates data
 */
async function fetchBitcoinRate(bitcoinConfig) {
  return new Promise((resolve, reject) => {
    console.log(`[${new Date().toISOString()}] Fetching BTC rate from: ${bitcoinConfig.api}`);

    https.get(bitcoinConfig.api, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const rate = parsed[bitcoinConfig.quoteCurrency].last;
          console.log(`[${new Date().toISOString()}] Successfully fetched BTC/${bitcoinConfig.quoteCurrency} rate:`, rate);
          resolve({ [bitcoinConfig.quoteCurrency]: rate });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`HTTP request failed: ${error.message}`));
    });
  });
}

module.exports = { fetchBitcoinRate };
