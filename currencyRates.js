/**
 * Currency Rates Fetcher
 *
 * Fetches fiat currency rates from Frankfurter API.
 */

const https = require('https');

/**
 * Fetch currency rates from Frankfurter API
 * @param {Object} fiatConfig - Fiat configuration from config.js
 * @returns {Promise<Object>} - Rates data
 */
async function fetchCurrencyRates(fiatConfig) {
  return new Promise((resolve, reject) => {
    const url = `${fiatConfig.api}?from=${fiatConfig.baseCurrency}&to=${fiatConfig.currencies.join(',')}`;

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

module.exports = { fetchCurrencyRates };
