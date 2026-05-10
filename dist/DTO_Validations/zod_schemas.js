"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDoctorSchema = exports.verifyEmailSchema = exports.reviewSchema = exports.updateUserSchema = exports.loginUserSchema = exports.registerUserSchema = void 0;
var zod_1 = require("zod");
var libphonenumber_js_1 = require("libphonenumber-js");
exports.registerUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({ required_error: "Name is required" }).max(20, "Name must be less than 20 characters"),
        email: zod_1.z.string({ required_error: "Email is required" }).email("Invalid email format"),
        password: zod_1.z.string({ required_error: "Password is required" }).min(8, "Password must be at least 8 characters"),
        phone: zod_1.z.string({ required_error: "Phone number is required" })
            .refine(function (value) {
            var _a;
            var phoneNumber = (0, libphonenumber_js_1.parsePhoneNumberFromString)(value);
            return (_a = phoneNumber === null || phoneNumber === void 0 ? void 0 : phoneNumber.isValid()) !== null && _a !== void 0 ? _a : false;
        }, {
            message: "Country code e.g +234... required"
        }),
        role: zod_1.z.enum(['patient', 'doctor'], { required_error: "Role is required" }),
        gender: zod_1.z.enum(['male', 'female', 'other'], { required_error: "Gender is required" }),
        photo: zod_1.z.any()
    })
});
exports.loginUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string({ required_error: "Email is required" }).email("Invalid email format"),
        password: zod_1.z.string({ required_error: "Password is required" }).min(8, "Password must be at least 8 characters"),
    })
});
exports.updateUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({ required_error: "Name is required" }).max(20, "Name must be less than 20 characters").optional(),
        phone: zod_1.z.string()
            .refine(function (value) {
            var _a;
            var phoneNumber = (0, libphonenumber_js_1.parsePhoneNumberFromString)(value);
            return (_a = phoneNumber === null || phoneNumber === void 0 ? void 0 : phoneNumber.isValid()) !== null && _a !== void 0 ? _a : false;
        }, {
            message: "Invalid phone number"
        }).optional(),
        role: zod_1.z.enum(['patient', 'doctor']).optional(),
        gender: zod_1.z.enum(['male', 'female', 'other']).optional(),
        bloodType: zod_1.z.string().max(3, 'Invalid blood type').min(2, 'Invalid blood type').optional()
    })
});
exports.reviewSchema = zod_1.z.object({
    body: zod_1.z.object({
        reviewText: zod_1.z.string({ required_error: "Review text is required" }).max(500, "Review text must be less than 500 characters"),
        rating: zod_1.z.number({ required_error: "Rating is required" })
    }),
}).required();
exports.verifyEmailSchema = zod_1.z.object({
    query: zod_1.z.object({
        id: zod_1.z.string({ required_error: "User ID is required" }),
        token: zod_1.z.string({ required_error: "Verification token is required" })
    })
});
var qualificationSchema = zod_1.z.object({
    startDate: zod_1.z.string().min(1, 'Start date is required'),
    endDate: zod_1.z.string().min(1, 'End date is required'),
    degree: zod_1.z.string().min(1, 'Degree is required'),
    university: zod_1.z.string().min(1, 'University is required'),
});
var experienceSchema = zod_1.z.object({
    startDate: zod_1.z.string().min(1, 'Start date is required'),
    endDate: zod_1.z.string().min(1, 'End date is required'),
    position: zod_1.z.string().min(1, 'Position is required'),
    hospital: zod_1.z.string().min(1, 'Hospital is required'),
});
var timeSlotSchema = zod_1.z.object({
    day: zod_1.z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], { errorMap: function () { return ({ message: 'Invalid day' }); } }),
    startingTime: zod_1.z.string().min(1, 'Starting time is required'),
    endingTime: zod_1.z.string().min(1, 'Ending time is required'),
});
exports.updateDoctorSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(3, 'Name too short').max(30, 'Name too long').optional(),
        email: zod_1.z.string().email('Invalid email address').optional(),
        phone: zod_1.z.string().min(11, 'Invalid phone number').max(15, 'Invalid phone number').optional(),
        gender: zod_1.z.enum(['male', 'female', 'others']).optional(),
        specialization: zod_1.z.string().min(3, 'Specialization too short').max(50, 'Specialization too long').optional(),
        bio: zod_1.z.string().max(50, 'Bio exceeded max character limit').optional(),
        about: zod_1.z.string().max(500, 'About exceeded max character limit').optional(),
        ticketPrice: zod_1.z
            .union([zod_1.z.number(), zod_1.z.string()])
            .transform(function (val) { return Number(val); })
            .refine(function (val) { return !isNaN(val) && val >= 0; }, 'Invalid ticket price')
            .optional(),
        qualifications: zod_1.z
            .union([zod_1.z.string(), zod_1.z.array(qualificationSchema)])
            .transform(function (val) { return (typeof val === 'string' ? JSON.parse(val) : val); })
            .pipe(zod_1.z.array(qualificationSchema))
            .optional(),
        experience: zod_1.z
            .union([zod_1.z.string(), zod_1.z.array(experienceSchema)])
            .transform(function (val) { return (typeof val === 'string' ? JSON.parse(val) : val); })
            .pipe(zod_1.z.array(experienceSchema))
            .optional(),
        timeSlots: zod_1.z
            .union([zod_1.z.string(), zod_1.z.array(timeSlotSchema)])
            .transform(function (val) { return (typeof val === 'string' ? JSON.parse(val) : val); })
            .pipe(zod_1.z.array(timeSlotSchema))
            .optional(),
    }),
});
//# sourceMappingURL=zod_schemas.js.map