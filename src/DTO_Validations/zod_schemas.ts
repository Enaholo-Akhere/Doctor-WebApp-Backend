import { TypeOf, z, } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js"


export const registerUserSchema = z.object({
    body: z.object({
        name: z.string({ required_error: "Name is required" }).max(20, "Name must be less than 20 characters"),
        email: z.string({ required_error: "Email is required" }).email("Invalid email format"),
        password: z.string({ required_error: "Password is required" }).min(8, "Password must be at least 8 characters"),
        phone: z.string()
            .refine((value) => {

                const phoneNumber = parsePhoneNumberFromString(value);

                return phoneNumber?.isValid() ?? false;
            }, {
                message: "Invalid phone number"
            }),
        photo: z.string().optional(),
        role: z.enum(['patient', 'doctor']),
        gender: z.enum(['male', 'female', 'other'])
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
        photo: z.string().optional(),
        role: z.enum(['patient', 'doctor']).optional(),
        gender: z.enum(['male', 'female', 'other']).optional()
    })
})

export const reviewSchema = z.object({
    body: z.object({
        reviewText: z.string({ required_error: "Review text is required" }).max(500, "Review text must be less than 500 characters"),
        rating: z.number({ required_error: "Rating is required" })
    }),
}).required()
export type RegisterUserInput = TypeOf<typeof registerUserSchema>