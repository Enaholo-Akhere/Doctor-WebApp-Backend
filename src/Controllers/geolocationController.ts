import { winston_logger } from "@utils/logger";
import { detectPaymentProvider } from "@utils/paymentProvider";
import { Request, Response } from "express";

export const geolocation = async (req: Request, res: Response) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
        req.socket.remoteAddress ||
        req.ip ||
        "";

    try {
        const { currency, exchangeRate, countryCode, provider } = await detectPaymentProvider(ip);
        console.log('ip address', ip)
        console.log('currency', currency, 'exchRate', exchangeRate, 'countryCode', countryCode, 'provider', provider)
        res.status(200).json({ message: "Welcome to CareConnect API", ip, currency, exchangeRate, countryCode, provider })
    }
    catch (error: any) {
        winston_logger.error(error.message.error.stack);
        res.status(500).json({ message: error.message });
    }

}