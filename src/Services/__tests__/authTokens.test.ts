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
});

vi.mock('@utils/message/nodemailer', () => ({ sendVerificationEmail: vi.fn() }));

import { generateKeyPairSync } from 'crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from 'models/UserSchema';
import Doctor from 'models/DoctorSchema';
import { ISSUER } from 'config/constant';
import { sanitizedUser } from 'Middleware/sanitized';
import { loginServices, logoutService, refreshedTokenService } from 'Services/authService';

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
    await Promise.all([User.deleteMany({}), Doctor.deleteMany({})]);
});

const PASSWORD = 'password123';
const makePatient = async (fields: Record<string, unknown> = {}) =>
    new User({
        name: 'Ada', email: 'ada@x.com', password: await bcrypt.hash(PASSWORD, 4), role: 'patient',
        verified: true, photo: { imageUrl: 'u', publicId: 'p' }, ...fields,
    }).save();

const login = async () => {
    const res = await loginServices({ email: 'ada@x.com', password: PASSWORD });
    expect(res.error).toBeUndefined();
    return res as { token: string; refreshedToken: string };
};

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
/** A token with no signature at all (`alg: none`). */
const unsigned = (sub: string, aud = 'patient-aud') =>
    `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub, aud, iss: ISSUER, exp: Math.floor(Date.now() / 1000) + 3600 })}.`;
/** A well-formed RS256 token signed with a key the server doesn't know. */
const wrongKey = (sub: string, aud = 'patient-aud') => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    return jwt.sign({ sub }, privateKey, { algorithm: 'RS256', audience: aud, issuer: ISSUER, expiresIn: '1h' });
};

/** Runs the HTTP auth middleware and reports whether it let the request through. */
const authenticate = async (token: string) => {
    const req = { get: () => `Bearer ${token}`, method: 'GET' } as any;
    const res = { locals: {} } as any;
    const next = vi.fn();
    await sanitizedUser(req, res, next);
    const err = next.mock.calls[0]?.[0];
    return { passed: next.mock.calls.length === 1 && err === undefined, err, auth: res.locals.auth };
};

describe('protected routes (access tokens)', () => {
    it('accept a real access token', async () => {
        const user = await makePatient();
        const { token } = await login();
        const result = await authenticate(token);
        expect(result.passed).toBe(true);
        expect(result.auth.id).toBe(String(user._id));
    });

    it('reject an unsigned token for a real, logged-in user', async () => {
        const user = await makePatient();
        await login();
        const result = await authenticate(unsigned(String(user._id)));
        expect(result.passed).toBe(false);
        expect(result.err.statusCode).toBe(401);
    });

    it('reject a token signed with the wrong key', async () => {
        const user = await makePatient();
        await login();
        const result = await authenticate(wrongKey(String(user._id)));
        expect(result.passed).toBe(false);
        expect(result.err.statusCode).toBe(401);
    });
});

describe('refreshing', () => {
    it('issues a new access token for a real refresh token', async () => {
        const user = await makePatient();
        const { refreshedToken } = await login();
        const res = await refreshedTokenService(refreshedToken, String(user._id));
        expect(res.error).toBeNull();
        expect((jwt.decode(res.token!) as jwt.JwtPayload).sub).toBe(String(user._id));
    });

    it('rejects an unsigned refresh token (the account-takeover case)', async () => {
        const user = await makePatient();
        await login();
        const res = await refreshedTokenService(unsigned(String(user._id)), String(user._id));
        expect(res.token).toBeNull();
        expect(res.error).toBeTruthy();
    });

    it('rejects a refresh token signed with the wrong key', async () => {
        const user = await makePatient();
        await login();
        const res = await refreshedTokenService(wrongKey(String(user._id)), String(user._id));
        expect(res.token).toBeNull();
    });

    it("rejects one user's real token used for another user", async () => {
        await makePatient();
        const { refreshedToken } = await login();
        const other = await makePatient({ email: 'bob@x.com' });
        const res = await refreshedTokenService(refreshedToken, String(other._id));
        expect(res.token).toBeNull();
    });

    it('stops working after logout', async () => {
        const user = await makePatient();
        const { refreshedToken } = await login();
        await logoutService(String(user._id));
        const res = await refreshedTokenService(refreshedToken, String(user._id));
        expect(res.token).toBeNull();
    });

    it('stops working once the account is deactivated', async () => {
        const user = await makePatient();
        const { refreshedToken } = await login();
        await User.updateOne({ _id: user._id }, { deletedAt: new Date() });
        expect((await refreshedTokenService(refreshedToken, String(user._id))).token).toBeNull();
    });
});

describe('logging in', () => {
    it('leaves the stored session alone on a wrong password', async () => {
        // A sentinel, because a token re-issued within the same second would be identical anyway.
        const user = await makePatient({ refreshedToken: 'existing-session' });

        const res = await loginServices({ email: 'ada@x.com', password: 'wrong-password' });
        expect(res.message).toBe('Invalid email or password');
        expect((await User.findById(user._id))!.refreshedToken).toBe('existing-session');
    });

    it('issues no session for unverified or deactivated accounts', async () => {
        const unverified = await makePatient({ verified: false });
        expect((await loginServices({ email: 'ada@x.com', password: PASSWORD })).error).toBeTruthy();
        expect((await User.findById(unverified._id))!.refreshedToken).toBeUndefined();

        await User.deleteMany({});
        const deactivated = await makePatient({ deletedAt: new Date() });
        expect((await loginServices({ email: 'ada@x.com', password: PASSWORD })).message).toBe('This account has been deactivated');
        expect((await User.findById(deactivated._id))!.refreshedToken).toBeUndefined();
    });

    it('logs doctors in with the doctor audience', async () => {
        await new Doctor({
            name: 'Dr', email: 'doc@x.com', password: await bcrypt.hash(PASSWORD, 4), verified: true,
            photo: { imageUrl: 'u', publicId: 'p' },
        }).save();
        const res = await loginServices({ email: 'doc@x.com', password: PASSWORD });
        expect(res.error).toBeUndefined();
        expect((jwt.decode(res.token!) as jwt.JwtPayload).aud).toBe('doctor-aud');
    });
});
