import { verifyEmail } from 'Controllers/authController';
import { TypeOf, z, } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js"


export const registerUserSchema = z.object({
    body: z.object({
        name: z.string({ required_error: "Name is required" }).max(20, "Name must be less than 20 characters"),
        email: z.string({ required_error: "Email is required" }).email("Invalid email format"),
        password: z.string({ required_error: "Password is required" }).min(8, "Password must be at least 8 characters"),
        phone: z.string({ required_error: "Phone number is required" })
            .refine((value) => {

                const phoneNumber = parsePhoneNumberFromString(value);

                return phoneNumber?.isValid() ?? false;
            }, {
                message: "Country code e.g +234... required"
            }),
        role: z.enum(['patient', 'doctor'], { required_error: "Role is required" }),
        gender: z.enum(['male', 'female', 'other'], { required_error: "Gender is required" }),
        photo: z.any()
    })
})



export const loginUserSchema = z.object({
    body: z.object({
        email: z.string({ required_error: "Email is required" }).email("Invalid email format"),
        password: z.string({ required_error: "Password is required" }).min(8, "Password must be at least 8 characters"),
    })
});

export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string({ required_error: "Email is required" }).email("Invalid email format"),
    })
})

export const setPasswordSchema = z.object({
    body: z.object({
        password: z.string({ required_error: "Password is required" }).min(8, "Password must be at least 8 characters"),
    })
})


export const updateUserSchema = z.object({
    body: z.object({
        name: z.string({ required_error: "Name is required" }).trim().min(3, "Name is too short").max(50, "Name must be less than 50 characters").optional(),
        phone: z.string()
            .refine((value) => {

                const phoneNumber = parsePhoneNumberFromString(value);

                return phoneNumber?.isValid() ?? false;
            }, {
                message: "Invalid phone number"
            }).optional(),
        role: z.enum(['patient', 'doctor']).optional(),
        gender: z.enum(['male', 'female', 'other']).optional(),
        bloodType: z.string().max(3, 'Invalid blood type').min(2, 'Invalid blood type').optional()
    })
})


const isValidPhone = (value: string) => parsePhoneNumberFromString(value)?.isValid() ?? false;
const healthList = z.array(z.string().trim().min(1).max(60)).max(30, "Too many entries");

export const healthProfileSchema = z.object({
    body: z.object({
        dateOfBirth: z.union([
            z.literal(''),
            z.string().refine((value) => {
                const date = new Date(value);
                return !Number.isNaN(date.getTime()) && date <= new Date() && date.getFullYear() >= 1900;
            }, { message: "Invalid date of birth" }),
        ]).optional(),
        address: z.string().trim().max(200, "Address is too long").optional(),
        heightCm: z.union([z.null(), z.number().min(30, "Invalid height").max(272, "Invalid height")]).optional(),
        weightKg: z.union([z.null(), z.number().min(1, "Invalid weight").max(500, "Invalid weight")]).optional(),
        bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
        genotype: z.union([z.literal(''), z.enum(["AA", "AS", "AC", "SS", "SC", "CC"])]).optional(),
        allergies: healthList.optional(),
        chronicConditions: healthList.optional(),
        medications: healthList.optional(),
        emergencyContact: z.object({
            name: z.string().trim().max(60).optional(),
            relationship: z.string().trim().max(40).optional(),
            phone: z.union([z.literal(''), z.string().refine(isValidPhone, { message: "Emergency contact phone needs a valid number with country code" })]).optional(),
        }).optional(),
    }).strict(),
})


export const reviewSchema = z.object({
    body: z.object({
        reviewText: z.string({ required_error: "Review text is required" }).max(500, "Review text must be less than 500 characters"),
        rating: z.number({ required_error: "Rating is required" })
    }),
}).required()
export type RegisterUserInput = TypeOf<typeof registerUserSchema>

export const resendVerificationSchema = z.object({
    body: z.object({
        email: z.string({ required_error: "Email is required" }).email("Invalid email format"),
    })
})

export const verifyEmailSchema = z.object({
    query: z.object({
        id: z.string({ required_error: "User ID is required" }),
        token: z.string({ required_error: "Verification token is required" })
    })
})

const qualificationSchema = z.object({
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    degree: z.string().min(1, 'Degree is required'),
    university: z.string().min(1, 'University is required'),
});

const experienceSchema = z.object({
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    position: z.string().min(1, 'Position is required'),
    hospital: z.string().min(1, 'Hospital is required'),
});

const timeSlotSchema = z.object({
    day: z.enum(
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        { errorMap: () => ({ message: 'Invalid day' }) }
    ),
    startingTime: z.string().min(1, 'Starting time is required'),
    endingTime: z.string().min(1, 'Ending time is required'),
});


export const updateDoctorSchema = z.object({
    body: z.object({
        name: z.string().trim().min(3, 'Name too short').max(50, 'Name too long').optional(),
        email: z.string().email('Invalid email address').optional(),
        phone: z.string().min(11, 'Invalid phone number').max(15, 'Invalid phone number').optional(),
        gender: z.enum(['male', 'female', 'other']).optional(),
        specialization: z.string().min(3, 'Specialization too short').max(50, 'Specialization too long').optional(),
        bio: z.string().max(50, 'Bio exceeded max character limit').optional(),
        about: z.string().max(1500, 'About exceeded max character limit').optional(),
        ticketPrice: z
            .union([z.number(), z.string()])
            .transform((val) => Number(val))
            .refine((val) => !isNaN(val) && val >= 0, 'Invalid ticket price')
            .optional(),
        qualifications: z
            .union([z.string(), z.array(qualificationSchema)])
            .transform((val) => (typeof val === 'string' ? JSON.parse(val) : val))
            .pipe(z.array(qualificationSchema))
            .optional(),
        experiences: z
            .union([z.string(), z.array(experienceSchema)])
            .transform((val) => (typeof val === 'string' ? JSON.parse(val) : val))
            .pipe(z.array(experienceSchema))
            .optional(),
        timeSlots: z
            .union([z.string(), z.array(timeSlotSchema)])
            .transform((val) => (typeof val === 'string' ? JSON.parse(val) : val))
            .pipe(z.array(timeSlotSchema))
            .optional(),
    }),
});

export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;

export const bookingStatusSchema = z.object({
    body: z.object({
        status: z.enum(['approved', 'cancelled'], { errorMap: () => ({ message: 'Status must be approved or cancelled' }) }),
    }),
})

// ── Doctor verification (admin) ─────────────────────────────────────
const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const reviewDocumentSchema = z.object({
    params: z.object({ id: objectId, documentId: objectId }),
    body: z.object({
        status: z.enum(['accepted', 'rejected'], { required_error: 'Status is required' }),
        note: z.string().trim().max(500).optional(),
    }),
});

export const setApprovalSchema = z.object({
    params: z.object({ id: objectId }),
    body: z.object({
        status: z.enum(['approved', 'cancelled', 'pending'], { required_error: 'Status is required' }),
        note: z.string().trim().max(500).optional(),
    }),
});

// ── Admin accounts & messages ───────────────────────────────────────
const accountRole = z.enum(['patient', 'doctor']);

export const accountParamsSchema = z.object({ params: z.object({ role: accountRole, id: objectId.optional() }) });

export const updateAccountSchema = z.object({
    params: z.object({ role: accountRole, id: objectId }),
    body: z.object({
        name: z.string().trim().min(2, 'Name is too short').max(60).optional(),
        phone: z.string().trim().max(30).optional(),
        gender: z.enum(['male', 'female', 'other']).optional(),
        specialization: z.string().trim().max(60).optional(),
        ticketPrice: z.coerce.number().min(0).max(100000).optional(),
        bio: z.string().trim().max(50, 'Bio must be 50 characters or fewer').optional(),
    }).strict(),
});

export const sendMessageSchema = z.object({
    body: z.object({
        audience: z.enum(['all_patients', 'all_doctors', 'selected']),
        recipients: z.array(z.object({ id: objectId, role: accountRole })).max(2000).optional(),
        subject: z.string().trim().min(1, 'Add a subject').max(200),
        html: z.string().min(1, 'Write a message').max(100_000),
    }),
});
