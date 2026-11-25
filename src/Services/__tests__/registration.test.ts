import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// Token signing reads its keys and audiences when the modules load, so set them first.
vi.hoisted(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { generateKeyPairSync } = require('crypto');
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    process.env.PRIVATE_KEY = privateKey;
    process.env.PUBLIC_KEY = publicKey;
    process.env.PATIENT_AUD = 'patient-aud';
    process.env.DOCTOR_AUD = 'doctor-aud';
    process.env.ACCESS_TOKEN_EXPIRY = '60m';
    process.env.REFRESH_TOKEN_EXPIRY = '2d';
    process.env.DEV_CLIENT_URL = 'http://localhost:5173';
});

vi.mock('@utils/message/nodemailer', () => ({
    sendVerificationEmail: vi.fn(async () => ({ sent: { messageId: '<id>' } })),
}));

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from 'models/UserSchema';
import Doctor from 'models/DoctorSchema';
import { sendVerificationEmail } from '@utils/message/nodemailer';
import { generateAccessToken, verifyToken } from '@utils/generateTokens';
import { verifyEmailTemplate } from '@utils/message/emailTemplate';
import {
    createVerificationToken, loginServices, registerService, RESEND_MESSAGE,
    resendVerificationService, verifyEmailService,
} from 'Services/authService';

let mongo: MongoMemoryServer;
beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60_000 } });
    await mongoose.connect(mongo.getUri());
}, 120_000);
afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
});
afterEach(async () => {
    vi.clearAllMocks();
    await Promise.all([User.deleteMany({}), Doctor.deleteMany({})]);
});

const signup = (fields: Record<string, unknown> = {}) =>
    registerService({
        name: 'Ada', email: 'ada@x.com', password: 'password123', role: 'patient', gender: 'female',
        phone: '+2349012345678', photo: { imageUrl: 'u', publicId: 'p' }, ...fields,
    } as any) as Promise<any>;

describe('registration', () => {
    it('creates an unverified account and returns a verification token for it', async () => {
        const { data, token, error } = await signup();
        expect(error).toBeUndefined();
        expect(typeof token).toBe('string');
        expect((jwt.decode(token) as jwt.JwtPayload).sub).toBe(String(data._id));
        expect((await User.findById(data._id))?.verified).toBe(false);
    });

    it('rejects an email already used by either role', async () => {
        await signup({ role: 'doctor' });
        const { error } = await signup({ role: 'patient' });
        expect(error.statusCode).toBe(409);
    });

    it('builds an email link to the verify page with both values', async () => {
        const { data, token } = await signup();
        const html = verifyEmailTemplate(data, token);
        const href = html.match(/href="([^"]*verify-email[^"]*)"/)?.[1] ?? '';
        const url = new URL(href);
        expect(url.origin).toBe('http://localhost:5173');
        expect(url.pathname).toBe('/verify-email');
        expect(url.searchParams.get('userId')).toBe(String(data._id));
        expect(url.searchParams.get('token')).toBe(token);
    });
});

describe('verifying the email', () => {
    it('verifies with the emailed token, and a second click still succeeds', async () => {
        const { data, token } = await signup();
        expect((await verifyEmailService(String(data._id), token)).error).toBeUndefined();
        expect((await User.findById(data._id))?.verified).toBe(true);
        expect((await verifyEmailService(String(data._id), token)).error).toBeUndefined();
    });

    it('verifies doctors too', async () => {
        const { data, token } = await signup({ role: 'doctor' });
        await verifyEmailService(String(data._id), token);
        expect((await Doctor.findById(data._id))?.verified).toBe(true);
    });

    it('rejects a missing, forged, or other-account token without verifying', async () => {
        const { data } = await signup();
        const other = await signup({ email: 'bob@x.com' });

        for (const bad of [undefined, 'undefined', 'garbage', other.token]) {
            const { error } = await verifyEmailService(String(data._id), bad);
            expect(error?.statusCode).toBe(400);
        }
        expect((await User.findById(data._id))?.verified).toBe(false);
    });

    it('rejects a login access token used as a verification token', async () => {
        const { data } = await signup();
        const { token } = generateAccessToken({ user: { id: String(data._id) }, options: { expiresIn: '1h' }, audience: 'patient-aud' });
        expect((await verifyEmailService(String(data._id), token)).error?.statusCode).toBe(400);
    });

    it('does not let a verification token pass as an access token', async () => {
        const { token } = await signup();
        expect(verifyToken(token, 'patient-aud').message).not.toBe('token active');
    });

    it('reports an expired link without deleting the account', async () => {
        const { data } = await signup();
        process.env.VERIFY_TOKEN_EXPIRY = '-1s';
        const { token } = createVerificationToken(String(data._id), 'patient');
        delete process.env.VERIFY_TOKEN_EXPIRY;

        expect((await verifyEmailService(String(data._id), token)).error?.statusCode).toBe(410);
        expect(await User.findById(data._id)).not.toBeNull();
    });

    it('rejects a malformed id', async () => {
        expect((await verifyEmailService('not-an-id', 'x')).error?.statusCode).toBe(400);
    });
});

describe('resending the link', () => {
    it('emails a working new link to an unverified account', async () => {
        const { data } = await signup();
        expect(await resendVerificationService('ada@x.com')).toEqual({ message: RESEND_MESSAGE });

        const [, token] = vi.mocked(sendVerificationEmail).mock.calls[0] as any;
        await verifyEmailService(String(data._id), token);
        expect((await User.findById(data._id))?.verified).toBe(true);
    });

    it('gives the same answer for unknown or verified emails without sending', async () => {
        const { data, token } = await signup();
        await verifyEmailService(String(data._id), token);

        expect(await resendVerificationService('ada@x.com')).toEqual({ message: RESEND_MESSAGE });
        expect(await resendVerificationService('nobody@x.com')).toEqual({ message: RESEND_MESSAGE });
        expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('reports a failed send', async () => {
        await signup();
        vi.mocked(sendVerificationEmail).mockResolvedValueOnce({ error: new Error('401') } as any);
        expect((await resendVerificationService('ada@x.com')).error?.statusCode).toBe(502);
    });
});

describe('logging in after signing up', () => {
    it('blocks login until the email is verified, then allows it', async () => {
        const { data, token } = await signup();
        expect((await loginServices({ email: 'ada@x.com', password: 'password123' })).message)
            .toBe('Please verify your email to login');

        await verifyEmailService(String(data._id), token);
        const res = await loginServices({ email: 'ada@x.com', password: 'password123' });
        expect(res.error).toBeUndefined();
        expect(res.token).toBeTruthy();
    });
});
