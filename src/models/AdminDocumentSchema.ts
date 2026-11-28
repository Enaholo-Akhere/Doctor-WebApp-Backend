import mongoose, { Schema } from 'mongoose';

/**
 * Files only admins can open from the dashboard. The file itself lives in
 * Cloudinary as an "authenticated" raw upload (no public URL); this record
 * holds what's needed to build a signed link to it.
 */
export interface IAdminDocument {
    title: string;
    fileName: string;
    publicId: string; // Cloudinary public id, ends in .pdf
    version: number; // Cloudinary version, part of the signed URL
    mimeType: string;
    bytes: number;
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
    },
    { timestamps: true, collection: 'admin_documents' },
);

export default mongoose.model<IAdminDocument>('AdminDocument', adminDocumentSchema);
