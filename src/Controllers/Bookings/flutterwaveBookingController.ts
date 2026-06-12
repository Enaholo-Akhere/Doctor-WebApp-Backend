import { Request, Response } from 'express';
// import Flutterwave from 'flutterwave-node-v3';
import axios from 'axios';

export const flutterInitialPayment = async (req: Request, res: Response) => {
    const { amount, email, name } = req.body;
    const secK = process.env.FLUTTER_SECRETE_KEY;
    const DEV_CLIENT_URL = process.env.DEV_CLIENT_URL
    const PROD_CLIENT_URL = process.env.PROD_CLIENT_URL
    const baseUrl = process.env.NODE_ENV === 'production' ? PROD_CLIENT_URL : DEV_CLIENT_URL
    const redirectUrl = `${baseUrl}/payment-success-fl`

    try {
        const response = await axios.post(
            'https://api.flutterwave.com/v3/payments',
            {
                tx_ref: `tx-${Date.now()}`,
                amount,
                currency: 'NGN',
                redirect_url: redirectUrl,
                customer: { email, name },
                customizations: {
                    title: 'CareConnect Payment',
                    description: 'Appointment booking payment',
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${secK}`,
                },
            }
        );

        res.json(response.data); // contains data.link
    } catch (error: any) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: 'Payment initiation failed' });
    }
};

// const pbk = process.env.FLUTTER_PUBLIC_KEY;
// const secK = process.env.FLUTTER_SECRETE_KEY;


// const flw = new Flutterwave(pbk, secK);
// console.log('flw2 keys:', Object.keys(flw));
// console.log('flw2 proto:', Object.getOwnPropertyNames(Object.getPrototypeOf(flw)));
// export const flutterInitialPayment = async (req: Request, res: Response) => {
//     const payload = {
//         tx_ref: `tx-${Date.now()}`,
//         amount: req.body.amount,
//         redirect_url: '',
//         customer: {
//             email: req.body.email,
//             name: req.body.name,
//         },
//         customizations: {
//             title: 'CareConnect Payment',
//             description: 'Appointment booking payment'
//         },
//     };
//     const response = await flw.Payment.initiate(payload);
//     console.log('response', response)
//     res.status(200).json({ data: response });
//     return
// }