import multer from 'multer';
import cloudinary from './cloudinaryConfig';
import { DOCUMENT_LINK_TTL_SECONDS, DOCUMENT_MAX_BYTES, DOCUMENT_MIME_TYPES } from './verification';

/**
 * Verification documents (IDs, licences) are sensitive, so unlike profile
 * photos they're uploaded with Cloudinary's "authenticated" type: the file
 * has no public URL and can only be opened through a signed, expiring link.
 */

/** Keeps the upload in memory so it can be checked before anything is stored. */
export const documentUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: DOCUMENT_MAX_BYTES, files: 1 },
    fileFilter: (_req, file, cb) => {
        if (DOCUMENT_MIME_TYPES.includes(file.mimetype)) return cb(null, true);
        cb(new Error('Only PDF, JPG, PNG or WEBP files are allowed'));
    },
});

export type StoredDocument = { publicId: string; resourceType: 'image' | 'raw'; format?: string };

/** PDFs go up as "raw" files: Cloudinary blocks PDF delivery as images on many accounts. */
export const storeDocument = (file: Express.Multer.File, doctorId: string): Promise<StoredDocument> => {
    const resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'image';
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                type: 'authenticated',
                resource_type: resourceType,
                folder: `CareConnectDoctorDocs/${doctorId}`,
                // Raw files keep their extension in the public id.
                ...(resourceType === 'raw' && { public_id: `${Date.now()}.pdf` }),
            },
            (error, result) => {
                if (error || !result) return reject(error ?? new Error('Upload failed'));
                resolve({ publicId: result.public_id, resourceType, format: result.format });
            },
        );
        stream.end(file.buffer);
    });
};

/** A link that opens the document for DOCUMENT_LINK_TTL_SECONDS, then stops working. */
export const documentViewUrl = ({ publicId, resourceType, format }: StoredDocument) =>
    cloudinary.utils.private_download_url(publicId, resourceType === 'raw' ? '' : format ?? 'jpg', {
        resource_type: resourceType,
        type: 'authenticated',
        expires_at: Math.floor(Date.now() / 1000) + DOCUMENT_LINK_TTL_SECONDS,
    });

export const deleteStoredDocument = ({ publicId, resourceType }: StoredDocument) =>
    cloudinary.uploader.destroy(publicId, { resource_type: resourceType, type: 'authenticated', invalidate: true });
