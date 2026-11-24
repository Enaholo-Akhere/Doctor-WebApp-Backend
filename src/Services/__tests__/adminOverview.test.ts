import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import User from 'models/UserSchema';
import Doctor from 'models/DoctorSchema';
import Booking from 'models/BookingSchema';
import Review from 'models/ReviewSchema';
import 'models/ConsultationSchema';
import { getAdminOverview } from 'Services/adminStatsService';

let mongo: MongoMemoryServer;
const NOW = new Date('2026-11-24T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

let overview: Awaited<ReturnType<typeof getAdminOverview>>;

beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60_000 } });
    await mongoose.connect(mongo.getUri());

    // Raw inserts so createdAt can be set and hooks (slug, photo checks) don't get in the way.
    const users = await User.collection.insertMany([
        { name: 'P1', email: 'p1@x.com', role: 'patient', createdAt: daysAgo(2) },
        { name: 'P2', email: 'p2@x.com', role: 'patient', createdAt: daysAgo(10) },
        { name: 'P3', email: 'p3@x.com', role: 'patient', createdAt: daysAgo(40) }, // previous 30-day period
        { name: 'Admin', email: 'a@x.com', role: 'admin', createdAt: daysAgo(1) },
    ]);
    const [p1, p2] = Object.values(users.insertedIds);

    const doc = (fields: Record<string, unknown>) => ({ password: 'x', photo: { imageUrl: 'u', publicId: 'p' }, createdAt: daysAgo(100), ...fields });
    const inDays = (n: number) => new Date(NOW.getTime() + n * 86_400_000);
    const docs = await Doctor.collection.insertMany([
        doc({ name: 'Busy', email: 'd1@x.com', isApproved: 'approved', slug: 'busy', averageRating: 4.5,
            verificationDocuments: [{ _id: new mongoose.Types.ObjectId(), kind: 'practising_licence', status: 'accepted', expiresAt: inDays(10), uploadedAt: daysAgo(50), publicId: 'x', resourceType: 'image' }] }),
        doc({ name: 'Idle', email: 'd2@x.com', isApproved: 'approved', slug: 'idle' }),
        doc({ name: 'Ready', email: 'd3@x.com', isApproved: 'pending', createdAt: daysAgo(3), verificationDocuments: ['government_id', 'practising_licence', 'medical_degree'].map((kind) => ({
            _id: new mongoose.Types.ObjectId(), kind, status: 'pending', expiresAt: kind === 'practising_licence' ? inDays(300) : undefined, uploadedAt: daysAgo(1), publicId: 'x', resourceType: 'image',
        })) }),
        doc({ name: 'Incomplete', email: 'd4@x.com', isApproved: 'pending', createdAt: daysAgo(5) }),
    ]);
    const [busy, idle] = Object.values(docs.insertedIds);

    const booking = (fields: Record<string, unknown>) => ({ sessionId: 's', ticketPrice: '100', status: 'approved', isPaid: true, user: p1, doctor: busy, ...fields });
    await Booking.collection.insertMany([
        booking({ createdAt: daysAgo(1), updatedAt: daysAgo(1) }),
        booking({ createdAt: daysAgo(5), updatedAt: daysAgo(5), ticketPrice: '50', user: p2 }),
        booking({ createdAt: daysAgo(4), updatedAt: daysAgo(4), status: 'pending' }), // paid, unconfirmed for 4 days
        booking({ createdAt: daysAgo(3), updatedAt: daysAgo(2), status: 'cancelled', isPaid: false, doctor: idle }),
        booking({ createdAt: daysAgo(6), updatedAt: daysAgo(6), isPaid: false, status: 'pending' }), // abandoned checkout
        booking({ createdAt: daysAgo(45), updatedAt: daysAgo(45), ticketPrice: '200' }), // previous period
    ]);
    await Review.collection.insertMany([
        { doctor: busy, user: p1, reviewText: 'Great', rating: 5, createdAt: daysAgo(1) },
        { doctor: busy, user: p2, reviewText: 'OK', rating: 4, createdAt: daysAgo(60) },
    ]);

    overview = await getAdminOverview(30, NOW);
}, 120_000);

afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
});

describe('admin overview', () => {
    it('counts patients and compares with the previous period', () => {
        expect(overview.patients.total).toBe(3); // admins aren't patients
        expect(overview.patients.new).toEqual({ current: 2, previous: 1, changePct: 100 });
    });

    it('reports supply: doctors by status and how many got booked', () => {
        expect(overview.doctors).toMatchObject({ approved: 2, pending: 2, notApproved: 0, newSignups: 2, bookedDoctors: 1, utilizationPct: 50 });
    });

    it('reports bookings, payment and cancellation rates', () => {
        expect(overview.bookings.created).toBe(5);
        expect(overview.bookings.paid).toEqual({ current: 3, previous: 1, changePct: 200 });
        expect(overview.bookings.paymentRatePct).toBe(60);
        expect(overview.bookings.cancellationRatePct).toBe(20);
    });

    it('sums revenue in USD from paid bookings only', () => {
        expect(overview.revenue.total).toEqual({ current: 250, previous: 200, changePct: 25 });
        expect(overview.revenue.perBooking).toBe(83.33);
    });

    it('reports ratings and reviews', () => {
        expect(overview.quality).toMatchObject({ averageRating: 4.5, totalReviews: 2, newReviews: 1 });
    });

    it('builds a zero-filled daily series for the period', () => {
        expect(overview.series).toHaveLength(30);
        expect(overview.series.reduce((s, d) => s + d.bookings, 0)).toBe(3);
        expect(overview.series.reduce((s, d) => s + d.revenue, 0)).toBe(250);
        expect(overview.series.reduce((s, d) => s + d.signups, 0)).toBe(2);
    });

    it('lists what needs attention', () => {
        const a = overview.attention;
        expect(a.readyForReview.map((d) => d.name)).toEqual(['Ready']);
        expect(a.licencesExpiring.map((d) => d.name)).toEqual(['Busy']);
        expect(a.unconfirmedBookings).toHaveLength(1);
        expect(a.unconfirmedBookings[0]).toMatchObject({ patient: 'P1', feeUsd: 100, doctor: { name: 'Busy' } });
        expect(a.recentCancellations.map((b) => b.doctor?.name)).toEqual(['Idle']);
    });

    it('ranks top doctors by paid bookings', () => {
        expect(overview.topDoctors).toEqual([expect.objectContaining({ name: 'Busy', bookings: 3, revenue: 250 })]);
    });

    it('falls back to 30 days for an unsupported period', async () => {
        expect((await getAdminOverview(12, NOW)).period.days).toBe(30);
    });
});
