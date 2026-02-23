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
})

export const updateUserSchema = z.object({
    body: z.object({
        name: z.string({ required_error: "Name is required" }).max(20, "Name must be less than 20 characters").optional(),
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

export const reviewSchema = z.object({
    body: z.object({
        reviewText: z.string({ required_error: "Review text is required" }).max(500, "Review text must be less than 500 characters"),
        rating: z.number({ required_error: "Rating is required" })
    }),
}).required()
export type RegisterUserInput = TypeOf<typeof registerUserSchema>

export const verifyEmailSchema = z.object({
    query: z.object({
        id: z.string({ required_error: "User ID is required" }),
        token: z.string({ required_error: "Verification token is required" })
    })
})