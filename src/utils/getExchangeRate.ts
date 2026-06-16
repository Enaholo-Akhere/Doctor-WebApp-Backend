import axios from 'axios';

let rateCache: { rates: Record<string, number>, fetchedAt: number } | null = null;

export const getExchangeRates = async (): Promise<Record<string, number>> => {
    const ONE_HOUR = 60 * 60 * 1000;
    const now = Date.now();

    if (!rateCache || now - rateCache.fetchedAt > ONE_HOUR) {
        const response = await axios.get('https://open.er-api.com/v6/latest/USD');
        rateCache = { rates: response.data.rates, fetchedAt: now };
    }

    return rateCache.rates;
};
