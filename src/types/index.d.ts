import { ReactNode } from 'react';
export interface UserSchemaInterface {
    email: string;
    password: string;
    name: string;
    phone: string;
    photo: string;
    role: "patient" | "doctor";
    gender: "male" | "female" | "other";
    bloodType: string;
    appointments: mongoose.ObjectId
    id: mongoose.ObjectId
}

export interface ReviewSchemaInterface {
    doctor: mongoose.ObjectId;
    user: mongoose.ObjectId;
    reviewText: string;
    rating: number
}

export interface DoctorSchemaInterface {
    id: mongoose.ObjectId
    email: string;
    password: string;
    name: string;
    phone: string;
    photo: string;
    ticketPrice: number;
    role: string;
    specialization: string;
    qualifications: string[];
    experiences: string[];
    bio: string;
    about: string;
    timeSlots: string[];
    reviews: mongoose.ObjectId[]
    averageRating: number;
    totalRating: number;
    isApproved: "pending" | "approved" | "cancelled";
    appointments: mongoose.ObjectId[];
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