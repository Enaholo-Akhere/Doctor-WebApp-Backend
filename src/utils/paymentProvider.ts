import geoip from 'geoip-lite';
import { flutterwaveCountries, stripeCountries } from 'config/countriesLists';
import { getExchangeRates } from './getExchangeRate';

export const detectPaymentProvider = async (ip: string) => {
    const geo = geoip.lookup(ip);
    const rates = await getExchangeRates();


    if (!geo) return { provider: 'stripe', currency: 'USD', countryCode: 'US' };
    const countryCode = geo.country;

    if (!geo) return {
        provider: 'stripe',
        currency: 'USD',
        countryCode: 'US',
        exchangeRate: 1
    };


    // check flutterwave first
    if (flutterwaveCountries[countryCode]) {
        const currency = flutterwaveCountries[countryCode]
        return {
            provider: 'flutterwave',
            currency,
            countryCode,
            exchangeRate: rates[countryCode] ?? 1
        };
    }

    if (stripeCountries[countryCode]) {

        const currency = stripeCountries[countryCode];

        return {
            provider: 'stripe',
            currency,
            countryCode,
            exchangeRate: rates[countryCode] ?? 1
        };
    }

    // unsupported country — default to stripe USD
    return { provider: 'stripe', currency: 'USD', countryCode };

}