import Booking from 'models/BookingSchema';
import { bookingActiveUntil } from 'ai-chat/services/aiChatPlan';
import type { AiChatTool } from './types';

/**
 * The caller's own most recent bookings (read-only). The user id always comes
 * from the authenticated session, never from the model's arguments, so the
 * model cannot look up anyone else's bookings.
 */
export const getMyBookingTool: AiChatTool = {
    definition: {
        name: 'getMyBooking',
        description:
            "Get the signed-in patient's own recent CareConnect bookings (doctor, specialty, status, payment, booked date, and whether it is still active). Use when the user asks about their appointment, booking or doctor.",
        parameters: { type: 'object', properties: {}, additionalProperties: false },
    },

    async run(_args, ctx) {
        if (ctx.identity.kind !== 'user') {
            return { content: { signedIn: false, note: 'The user is not signed in, so no bookings can be shown. Suggest logging in.' } };
        }

        const bookings = await Booking.find({ user: ctx.identity.userId })
            .sort({ createdAt: -1 })
            .limit(3)
            .populate<{ doctor: { name?: string; specialization?: string } | null }>({ path: 'doctor', select: 'name specialization' })
            .select('doctor status isPaid createdAt')
            .lean();

        if (!bookings.length) return { content: { signedIn: true, bookings: [] } };

        return {
            content: {
                signedIn: true,
                bookings: bookings.map((b) => {
                    const activeUntil = bookingActiveUntil({ createdAt: b.createdAt as Date });
                    return {
                        doctor: b.doctor?.name ?? 'Unknown doctor',
                        specialty: b.doctor?.specialization ?? null,
                        status: b.status,
                        paid: b.isPaid,
                        bookedOn: (b.createdAt as Date).toISOString().slice(0, 10),
                        active: b.isPaid && b.status !== 'cancelled' && activeUntil > ctx.now,
                        activeUntil: activeUntil.toISOString().slice(0, 10),
                    };
                }),
            },
        };
    },
};
