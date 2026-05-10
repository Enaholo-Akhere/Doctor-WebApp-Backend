import { ReactNode } from 'react';
export interface UserSchemaInterface {
    email: string;
    password: string;
    name: string;
    phone: string;
    photo?: { imageUrl: string | undefined, publicId: string | undefined };
    role: "patient" | "doctor";
    gender: "male" | "female" | "other";
    bloodType: string;
    appointments: mongoose.ObjectId
    verified: boolean;
    id: mongoose.ObjectId
}

export interface ReviewSchemaInterface {
    doctor: mongoose.ObjectId;
    user: mongoose.ObjectId;
    reviewText: string;
    rating: number
}
interface qualifications {
    degree: string;
    university: string;
    startDate: string;
    endDate: string;
}
export interface experiences {
    hospital: string;
    position: string;
    startDate: string;
    endDate: string;
}

export interface timeSlots {
    startingTime: string;
    endingTime: string;
    day: string;
}
export interface DoctorSchemaInterface {
    id: mongoose.ObjectId
    email: string;
    password: string;
    name: string;
    phone: string;
    gender: "male" | "female";
    photo?: { imageUrl: string | undefined, publicId: string | undefined };
    ticketPrice: number;
    role: string;
    specialization: string;
    qualifications: qualifications[];
    bio: string;
    about: string;
    timeSlots: timeSlots[];
    experiences: experiences[];
    reviews: mongoose.ObjectId[]
    averageRating: number;
    totalRating: number;
    isApproved: "pending" | "approved" | "cancelled";
    appointments: mongoose.ObjectId[];
    verified: boolean;
    photo?: { imageUrl: string | undefined, publicId: string | undefined };

}

export interface BookSchemaInterface {
    doctor: mongoose.ObjectId;
    user: mongoose.ObjectId;
    ticketPrice: string;
    appointmentDate: Date
    status: string;
    isPaid: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ReviewBodyInterface { doctor: string, user: string }

export { createUserInputType, loginUserInputType, editUserInputType as editUser } from './../zod-schema/zod.user.schema';


export interface decodedData {
    name: string;
    email: string;
    _id: string;
}

export interface mailOptions {
    from: string;
    to: string;
    subject: string;
    html: string;
};

export interface emailUrlAndName {
    name: string;
    url: string;
};

export interface forgotPassword {
    serial: number;
    reset_token: string;
    email: string;
}


export interface resetPasswordInterface {
    decoded: decodedData;
    message: string;
    expired: boolean;
}

export interface messageMeInterface {
    email: string;
    name: string;
    message: string;
    subject: string;
}

export interface decodedDataInterface {
    name: string;
    email: string;
    id: string;
}