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

export type RegisterUserInput = TypeOf<typeof registerUserSchema>