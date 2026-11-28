import crypto from 'crypto';
import mongoose, { Schema } from 'mongoose';

/**
 * Files only admins can open from the dashboard. The file itself lives in
 * Cloudinary as an "authenticated" raw upload (no public URL); this record
 * holds what's needed to serve it. Its link never expires: the random
 * `accessKey` in the URL is what makes it unguessable (see adminDocumentService).
 */

/** A random, URL-safe key: 32 characters, 192 bits. */
export const newAccessKey = () => crypto.randomBytes(24).toString('base64url');
export interface IAdminDocument {
    title: string;
    fileName: string;
    publicId: string; // Cloudinary public id, ends in .pdf
    version: number; // Cloudinary version, part of the signed URL
    mimeType: string;
    bytes: number;
    accessKey: string; // the secret part of the permanent link
    createdAt: Date;
    updatedAt: Date;
}

const adminDocumentSchema = new Schema<IAdminDocument>(
    {
        title: { type: String, required: true, trim: true },
        fileName: { type: String, required: true },
        publicId: { type: String, required: true, unique: true },
        version: { type: Number, required: true },
        mimeType: { type: String, default: 'application/pdf' },
        bytes: { type: Number, required: true },
        accessKey: { type: String, required: true, unique: true, default: newAccessKey },
    },
    { timestamps: true, collection: 'admin_documents' },
);

export default mongoose.model<IAdminDocument>('AdminDocument', adminDocumentSchema);
