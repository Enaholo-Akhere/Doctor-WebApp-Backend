import { z } from 'zod';
import Doctor from 'models/DoctorSchema';
import type { AiChatTool } from './types';

const argsSchema = z.object({ specialty: z.string().trim().max(60).optional() }).catch({});

const BOOKING_PAGE = '/doctors';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Where to book. With a specialty, suggests up to 3 approved doctors whose
 * specialization matches (public profile info only); otherwise the doctors page.
 */
export const getBookingLinkTool: AiChatTool = {
    definition: {
        name: 'getBookingLink',
        description:
            'Get a link for booking a CareConnect doctor, optionally for a specialty (e.g. "dermatologist", "cardiologist", "psychiatrist"). Use when recommending the user see a doctor or when they ask how to book. The app shows the link as a button; do not write URLs in your reply.',
        parameters: {
            type: 'object',
            properties: {
                specialty: { type: 'string', description: 'Optional medical specialty, in English.' },
            },
            additionalProperties: false,
        },
    },

    async run(rawArgs) {
        const { specialty } = argsSchema.parse(rawArgs ?? {});

        if (specialty) {
            // Match on the word stem so "dermatologist" also finds "dermatology".
            const stem = specialty.toLowerCase().replace(/(ologist|ology|ist|ian|y)$/i, '');
            const doctors = await Doctor.find({
                isApproved: 'approved',
                deletedAt: null,
                specialization: { $regex: escapeRegex(stem.length >= 4 ? stem : specialty), $options: 'i' },
            })
                .sort({ averageRating: -1 })
                .limit(3)
                .select('name specialization averageRating')
                .lean();

            if (doctors.length) {
                return {
                    content: {
                        found: doctors.length,
                        doctors: doctors.map((d) => ({ name: d.name, specialty: d.specialization, rating: d.averageRating ?? null })),
                        note: 'Buttons to these doctors are shown to the user.',
                    },
                    actions: [
                        ...doctors.map((d) => ({ type: 'booking' as const, label: `Book ${d.name}`, url: `/doctor/${d._id}` })),
                        { type: 'booking' as const, label: 'See all doctors', url: BOOKING_PAGE },
                    ],
                };
            }
        }

        return {
            content: { found: 0, note: 'A button to browse and book CareConnect doctors is shown to the user.' },
            actions: [{ type: 'booking', label: 'Book a doctor', url: BOOKING_PAGE }],
        };
    },
};
