import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer, Server as HttpServer } from 'http';
import { AddressInfo } from 'net';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Server } from 'socket.io';
import { io as connect, Socket as ClientSocket } from 'socket.io-client';

// Isolate the call handlers from bookings, push and chat persistence.
vi.mock('Starters/sockets/access', () => ({ canAccessPeer: async () => true, NOT_ALLOWED: 'not allowed' }));
vi.mock('Starters/sockets/presence', () => ({ presence: { isOnline: () => true } }));
vi.mock('Starters/sockets/chatHandlers', () => ({ emitNewMessage: () => undefined }));
vi.mock('Services/pushService', () => ({ hasSubscriptions: async () => false, sendToUser: async () => false }));
vi.mock('Services/chatService', async (importOriginal) => ({
    ...(await importOriginal<typeof import('Services/chatService')>()),
    getChatProfile: async (id: string, role: string) => ({ _id: id, name: role, photo: null, role }),
    saveMessage: async () => ({}),
}));

import Consultation from 'models/ConsultationSchema';
import { RECORDING_NOTICE } from 'config/recording';
import { registerCallHandlers } from 'Starters/sockets/callHandlers';
import { AppServer, userRoom } from 'Starters/sockets/types';

const doctorId = new mongoose.Types.ObjectId().toString();
const patientId = new mongoose.Types.ObjectId().toString();

let mongo: MongoMemoryServer;
let http: HttpServer;
let io: AppServer;
let url: string;
let doctor: ClientSocket;
let patient: ClientSocket;
let callId: string;

beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60_000 } });
    await mongoose.connect(mongo.getUri());
    // Build indexes now, so the first record insert isn't slowed by it.
    await Consultation.syncIndexes();

    http = createServer();
    io = new Server(http) as AppServer;
    // Test auth: trust the handshake identity.
    io.use((socket, next) => {
        const { id, name, role } = socket.handshake.auth as { id: string; name: string; role: 'doctor' | 'patient' };
        socket.data.user = { id, name, role };
        socket.data.contacts = new Set();
        next();
    });
    io.on('connection', (socket) => {
        socket.join(userRoom(socket.data.user.id));
        registerCallHandlers(io, socket);
    });
    await new Promise<void>((resolve) => http.listen(0, resolve));
    url = `http://localhost:${(http.address() as AddressInfo).port}`;
}, 120_000);

afterAll(async () => {
    io?.close();
    await mongoose.disconnect();
    await mongo?.stop();
});

const client = (id: string, name: string, role: string) =>
    new Promise<ClientSocket>((resolve) => {
        const s = connect(url, { auth: { id, name, role }, transports: ['websocket'], forceNew: true });
        s.on('connect', () => resolve(s));
    });

const next = <T = any>(socket: ClientSocket, event: string, ms = 8000) =>
    new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), ms);
        socket.once(event, (payload: T) => {
            clearTimeout(timer);
            resolve(payload);
        });
    });

const emit = <T = any>(socket: ClientSocket, event: string, payload: object) =>
    new Promise<T>((resolve) => socket.emit(event, payload, resolve));

/** Doctor calls the patient and the patient answers: an active call. */
beforeEach(async () => {
    process.env.TRANSCRIPTION_ENABLED = 'true';
    doctor = await client(doctorId, 'Dr Ada', 'doctor');
    patient = await client(patientId, 'Bola', 'patient');
    const incoming = next(patient, 'call:incoming');
    const invite = await emit(doctor, 'call:invite', { otherUserId: patientId, callType: 'audio' });
    expect(invite.ok).toBe(true);
    callId = invite.callId;
    await incoming;
    const accepted = next(doctor, 'call:accepted');
    expect((await emit(patient, 'call:accept', { callId })).ok).toBe(true);
    await accepted;
});

afterEach(async () => {
    const ended = next(patient, 'call:ended').catch(() => undefined);
    doctor.emit('call:end', { callId });
    await ended;
    doctor.close();
    patient.close();
    await Consultation.deleteMany({});
});

describe('recording consent', { timeout: 15_000 }, () => {
    it('is refused while transcription is turned off', async () => {
        process.env.TRANSCRIPTION_ENABLED = 'false';
        const res = await emit(doctor, 'call:record-request', { callId });
        expect(res).toEqual({ ok: false, error: 'Call recording is turned off' });
    });

    it('can only be requested by the doctor', async () => {
        const res = await emit(patient, 'call:record-request', { callId });
        expect(res).toEqual({ ok: false, error: 'Only the doctor can start a recording' });
    });

    it('creates nothing when the patient declines', async () => {
        const prompt = next(patient, 'call:record-consent-request');
        expect((await emit(doctor, 'call:record-request', { callId })).ok).toBe(true);
        expect(await prompt).toMatchObject({ callId, doctorName: 'Dr Ada', notice: RECORDING_NOTICE });

        const declined = next(doctor, 'call:record-declined');
        expect((await emit(patient, 'call:record-consent', { callId, accept: false })).ok).toBe(true);
        await declined;
        expect(await Consultation.countDocuments()).toBe(0);
    });

    it('does not let the doctor answer on the patient’s behalf', async () => {
        const prompt = next(patient, 'call:record-consent-request');
        await emit(doctor, 'call:record-request', { callId });
        await prompt;
        const res = await emit(doctor, 'call:record-consent', { callId, accept: true });
        expect(res).toEqual({ ok: false, error: 'Only the patient can answer' });
        expect(await Consultation.countDocuments()).toBe(0);
    });

    it('starts recording for both once the patient accepts, and stores both consents', async () => {
        const prompt = next(patient, 'call:record-consent-request');
        await emit(doctor, 'call:record-request', { callId });
        await prompt;

        const doctorStarted = next(doctor, 'call:record-started');
        const patientStarted = next(patient, 'call:record-started');
        expect((await emit(patient, 'call:record-consent', { callId, accept: true })).ok).toBe(true);
        const [d, p] = await Promise.all([doctorStarted, patientStarted]);
        expect(d.consultationId).toBe(p.consultationId);

        const record = await Consultation.findById(d.consultationId).lean();
        expect(record).toMatchObject({ status: 'recording', callId, callType: 'audio' });
        expect(String(record!.doctor)).toBe(doctorId);
        expect(String(record!.patient)).toBe(patientId);
        expect(record!.consent.noticeVersion).toBe(RECORDING_NOTICE.version);
        expect(record!.consent.doctorConsentedAt.getTime()).toBeLessThanOrEqual(record!.consent.patientConsentedAt.getTime());
    });

    it('lets the patient stop the recording, telling both sides', async () => {
        const prompt = next(patient, 'call:record-consent-request');
        await emit(doctor, 'call:record-request', { callId });
        await prompt;
        const started = next(doctor, 'call:record-started');
        await emit(patient, 'call:record-consent', { callId, accept: true });
        const { consultationId } = await started;

        const doctorStopped = next(doctor, 'call:record-stopped');
        patient.emit('call:record-stop', { callId });
        expect(await doctorStopped).toEqual({ callId, consultationId, by: 'patient' });
        await vi.waitFor(async () =>
            expect((await Consultation.findById(consultationId).lean())?.recordingEndedAt).toBeInstanceOf(Date)
        );
    });

    it('stops the recording when the call ends', async () => {
        const prompt = next(patient, 'call:record-consent-request');
        await emit(doctor, 'call:record-request', { callId });
        await prompt;
        const started = next(doctor, 'call:record-started');
        await emit(patient, 'call:record-consent', { callId, accept: true });
        const { consultationId } = await started;

        const stopped = next(doctor, 'call:record-stopped');
        patient.emit('call:end', { callId });
        expect(await stopped).toEqual({ callId, consultationId, by: 'system' });
    });

    it('lets the doctor withdraw a request before the patient answers', async () => {
        const prompt = next(patient, 'call:record-consent-request');
        await emit(doctor, 'call:record-request', { callId });
        await prompt;

        const withdrawn = next(patient, 'call:record-stopped');
        doctor.emit('call:record-stop', { callId });
        expect(await withdrawn).toEqual({ callId, consultationId: null, by: 'doctor' });

        const late = await emit(patient, 'call:record-consent', { callId, accept: true });
        expect(late).toEqual({ ok: false, error: 'There is no recording request to answer' });
        expect(await Consultation.countDocuments()).toBe(0);
    });
});
