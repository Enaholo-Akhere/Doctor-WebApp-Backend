import geoip from 'geoip-lite';
import { flutterwaveCountries, stripeCountries } from 'config/countriesLists';
import { getExchangeRates } from './getExchangeRate';
interface detectPaymentInterface {
    provider: string;
    currency: string;
    countryCode: string;
    exchangeRate: number;
}

export const detectPaymentProvider = async (ip: string): Promise<detectPaymentInterface> => {
    const geo = geoip.lookup(ip);

    const rates = await getExchangeRates();

    if (!geo) return {
        provider: 'stp',
        currency: 'USD',
        countryCode: 'US',
        exchangeRate: 1
    };

    const countryCode = geo.country;

    // check flutterwave first
    if (flutterwaveCountries[countryCode]) {
        const currency = flutterwaveCountries[countryCode];

        console.log('currency', currency)
        console.log('rate', rates[countryCode])
        return {
            provider: 'flw',
            currency,
            countryCode,
            exchangeRate: rates[currency] ?? 1
        };
    }

    if (stripeCountries[countryCode]) {

        const currency = stripeCountries[countryCode];

        return {
            provider: 'stp',
            currency,
            countryCode,
            exchangeRate: rates[currency] ?? 1
        };
    }

    // unsupported country — default to stripe USD
    return { provider: 'stp', currency: 'USD', countryCode, exchangeRate: 1 };

}