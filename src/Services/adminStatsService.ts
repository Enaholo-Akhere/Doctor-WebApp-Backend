import Booking from 'models/BookingSchema';
import Consultation from 'models/ConsultationSchema';
import Doctor from 'models/DoctorSchema';
import Review from 'models/ReviewSchema';
import User from 'models/UserSchema';
import { LICENCE_REMINDER_DAYS } from 'config/verification';
import { verificationSummary } from './verificationService';

/**
 * Numbers for the admin overview. Built around what marketplace operators
 * watch: demand (patients, bookings), supply (verified doctors and how many
 * actually get booked), money (revenue in USD, the doctors' base currency),
 * quality (cancellations, ratings) and a list of things needing action.
 *
 * Aggregates only: no health data, transcripts or messages.
 */

export const OVERVIEW_PERIODS = [7, 30, 90, 365] as const;
const DAY = 86_400_000;

/** A booking's fee in USD (ticketPrice is stored as a string). */
const FEE_USD = { $convert: { input: '$ticketPrice', to: 'double', onError: 0, onNull: 0 } };

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : null);
const change = (current: number, previous: number) => ({ current, previous, changePct: pct(current - previous, previous) });

const bookingTotals = async (from: Date, to: Date) => {
    const [row] = await Booking.aggregate<{
        created: number; paid: number; cancelled: number; revenue: number; doctors: unknown[];
    }>([
        { $match: { createdAt: { $gte: from, $lt: to } } },
        {
            $group: {
                _id: null,
                created: { $sum: 1 },
                paid: { $sum: { $cond: ['$isPaid', 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                revenue: { $sum: { $cond: ['$isPaid', FEE_USD, 0] } },
                doctors: { $addToSet: { $cond: ['$isPaid', '$doctor', '$$REMOVE'] } },
            },
        },
    ]);
    return row ?? { created: 0, paid: 0, cancelled: 0, revenue: 0, doctors: [] };
};

/** Daily counts, with zero-filled gaps, in UTC. */
const dailySeries = async (from: Date, days: number) => {
    const day = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    const [signups, bookings] = await Promise.all([
        User.aggregate<{ _id: string; n: number }>([
            { $match: { role: 'patient', createdAt: { $gte: from } } },
            { $group: { _id: day, n: { $sum: 1 } } },
        ]),
        Booking.aggregate<{ _id: string; n: number; revenue: number }>([
            { $match: { isPaid: true, createdAt: { $gte: from } } },
            { $group: { _id: day, n: { $sum: 1 }, revenue: { $sum: FEE_USD } } },
        ]),
    ]);
    const s = new Map(signups.map((r) => [r._id, r.n]));
    const b = new Map(bookings.map((r) => [r._id, r]));
    return Array.from({ length: days }, (_, i) => {
        const date = new Date(from.getTime() + i * DAY).toISOString().slice(0, 10);
        return { date, signups: s.get(date) ?? 0, bookings: b.get(date)?.n ?? 0, revenue: Math.round((b.get(date)?.revenue ?? 0) * 100) / 100 };
    });
};

const needsAttention = async (now: Date) => {
    const [pendingDoctors, approvedDoctors, staleBookings, recentCancellations] = await Promise.all([
        Doctor.find({ isApproved: 'pending' }).select('name specialization photo verificationDocuments createdAt').lean(),
        Doctor.find({ isApproved: 'approved' }).select('name slug verificationDocuments').lean(),
        // Paid but not confirmed by the doctor for 2+ days: the patient is waiting.
        Booking.find({ isPaid: true, status: 'pending', createdAt: { $lt: new Date(now.getTime() - 2 * DAY) } })
            .sort({ createdAt: 1 }).limit(10)
            .populate('doctor', 'name slug').populate('user', 'name').lean(),
        Booking.find({ status: 'cancelled', updatedAt: { $gte: new Date(now.getTime() - 7 * DAY) } })
            .sort({ updatedAt: -1 }).limit(5)
            .populate('doctor', 'name slug').populate('user', 'name').lean(),
    ]);

    const readyForReview = pendingDoctors
        .filter((d) => verificationSummary(d).readyForReview)
        .map((d) => ({ _id: String(d._id), name: d.name, specialization: d.specialization, photo: d.photo?.imageUrl, since: (d as { createdAt?: Date }).createdAt }));

    const soon = new Date(now.getTime() + LICENCE_REMINDER_DAYS * DAY);
    const licencesExpiring = approvedDoctors
        .map((d) => ({ d, expiresAt: verificationSummary(d).licenceExpiresAt }))
        .filter(({ expiresAt }) => expiresAt && new Date(expiresAt) < soon)
        .map(({ d, expiresAt }) => ({ _id: String(d._id), name: d.name, slug: d.slug, expiresAt }));

    const bookingRow = (b: any) => ({
        _id: String(b._id),
        doctor: b.doctor ? { _id: String(b.doctor._id), name: b.doctor.name } : null,
        patient: b.user?.name ?? 'Deleted account',
        feeUsd: Number(b.ticketPrice) || 0,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
    });

    return {
        readyForReview,
        licencesExpiring,
        unconfirmedBookings: staleBookings.map(bookingRow),
        recentCancellations: recentCancellations.map(bookingRow),
    };
};

const topDoctors = async (from: Date) => {
    const rows = await Booking.aggregate<{ _id: unknown; bookings: number; revenue: number }>([
        { $match: { isPaid: true, createdAt: { $gte: from } } },
        { $group: { _id: '$doctor', bookings: { $sum: 1 }, revenue: { $sum: FEE_USD } } },
        { $sort: { bookings: -1, revenue: -1 } },
        { $limit: 5 },
    ]);
    const doctors = await Doctor.find({ _id: { $in: rows.map((r) => r._id) } }).select('name specialization photo slug averageRating totalRating').lean();
    const byId = new Map(doctors.map((d) => [String(d._id), d]));
    return rows
        .map((r) => ({ r, d: byId.get(String(r._id)) }))
        .filter(({ d }) => d)
        .map(({ r, d }) => ({
            _id: String(d!._id),
            name: d!.name,
            specialization: d!.specialization,
            photo: d!.photo?.imageUrl,
            slug: d!.slug,
            rating: d!.averageRating,
            bookings: r.bookings,
            revenue: Math.round(r.revenue * 100) / 100,
        }));
};

export const getAdminOverview = async (periodDays: number, now = new Date()) => {
    const days = (OVERVIEW_PERIODS as readonly number[]).includes(periodDays) ? periodDays : 30;
    const from = new Date(now.getTime() - days * DAY);
    from.setUTCHours(0, 0, 0, 0);
    const prevFrom = new Date(from.getTime() - days * DAY);

    const [
        patientsTotal, patientsNew, patientsPrev,
        doctorsByStatus, doctorsNew,
        current, previous,
        rating, reviewsNew, consultations,
        series, attention, top,
    ] = await Promise.all([
        User.countDocuments({ role: 'patient' }),
        User.countDocuments({ role: 'patient', createdAt: { $gte: from } }),
        User.countDocuments({ role: 'patient', createdAt: { $gte: prevFrom, $lt: from } }),
        Doctor.aggregate<{ _id: string; n: number }>([{ $group: { _id: '$isApproved', n: { $sum: 1 } } }]),
        Doctor.countDocuments({ createdAt: { $gte: from } }),
        bookingTotals(from, now),
        bookingTotals(prevFrom, from),
        Review.aggregate<{ avg: number; n: number }>([{ $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]),
        Review.countDocuments({ createdAt: { $gte: from } }),
        Consultation.countDocuments({ createdAt: { $gte: from } }),
        Promise.all([dailySeries(from, days), dailySeries(prevFrom, days)]),
        needsAttention(now),
        topDoctors(from),
    ]);

    const doctors = Object.fromEntries(doctorsByStatus.map((r) => [r._id, r.n])) as Record<string, number>;
    const approved = doctors.approved ?? 0;
    const round = (n: number) => Math.round(n * 100) / 100;

    return {
        period: { days, from, to: now },
        patients: { total: patientsTotal, new: change(patientsNew, patientsPrev) },
        doctors: {
            approved,
            pending: doctors.pending ?? 0,
            notApproved: doctors.cancelled ?? 0,
            newSignups: doctorsNew,
            // Supply health: share of verified doctors who got at least one paid booking.
            utilizationPct: pct(current.doctors.length, approved),
            bookedDoctors: current.doctors.length,
        },
        bookings: {
            created: current.created,
            paid: change(current.paid, previous.paid),
            // Demand health: share of started bookings that were paid for.
            paymentRatePct: pct(current.paid, current.created),
            cancellationRatePct: pct(current.cancelled, current.created),
        },
        revenue: {
            currency: 'USD',
            total: change(round(current.revenue), round(previous.revenue)),
            perBooking: current.paid ? round(current.revenue / current.paid) : null,
        },
        quality: {
            averageRating: rating[0] ? Math.round(rating[0].avg * 10) / 10 : null,
            totalReviews: rating[0]?.n ?? 0,
            newReviews: reviewsNew,
            consultationsRecorded: consultations,
        },
        // Each day also carries the same day of the previous period, for the comparison line.
        series: series[0].map((d, i) => ({
            ...d,
            prevSignups: series[1][i]?.signups ?? 0,
            prevBookings: series[1][i]?.bookings ?? 0,
            prevRevenue: series[1][i]?.revenue ?? 0,
        })),
        attention,
        topDoctors: top,
    };
};
