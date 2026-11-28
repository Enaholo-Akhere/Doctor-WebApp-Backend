import { isValidObjectId } from 'mongoose';
import cloudinary from 'config/cloudinaryConfig';
import AdminDocument, { IAdminDocument, newAccessKey } from 'models/AdminDocumentSchema';
import { VerificationError } from 'Services/verificationService';

export const ADMIN_DOCS_FOLDER = 'CareConnectAdminDocs';

/** Uploads a PDF as an authenticated raw file, so it has no public URL. */
export const uploadAdminPdf = (buffer: Buffer, fileName: string) => {
    const base = fileName.replace(/\.pdf$/i, '').replace(/[^\w-]+/g, '_');
    return new Promise<{ public_id: string; version: number; bytes: number }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                type: 'authenticated',
                resource_type: 'raw',
                folder: ADMIN_DOCS_FOLDER,
                // Raw files keep their extension in the public id, so the URL ends in .pdf.
                public_id: `${base}-${Date.now()}.pdf`,
            },
            (error, result) => (error || !result ? reject(error ?? new Error('Upload failed')) : resolve(result)),
        );
        stream.end(buffer);
    });
};

/**
 * The document's permanent link: it ends in .pdf, never expires and needs no
 * auth header, so an <iframe> or react-pdf can load it as is, like a photo URL.
 * Anyone holding it can open the file; the random accessKey in the path makes
 * it unguessable, and only the admin-only endpoints below hand it out. To kill
 * a leaked link, give the document a new accessKey.
 * The path is relative to the API root (/api/v1).
 */
export const pdfLinkPath = (doc: { accessKey: string; fileName: string }) => {
    const name = /\.pdf$/i.test(doc.fileName) ? doc.fileName : `${doc.fileName}.pdf`;
    return `/files/admin-documents/${doc.accessKey}/${encodeURIComponent(name)}`;
};

/** The document a link's access key opens. */
export const documentForAccessKey = async (accessKey: string) => {
    const doc = /^[\w-]{32}$/.test(accessKey) ? await AdminDocument.findOne({ accessKey }).lean() : null;
    if (!doc) throw new VerificationError('Document not found', 404);
    return doc;
};

/** Gives records created before access keys existed a key of their own. */
const withAccessKey = async <T extends { _id: unknown; accessKey?: string }>(doc: T) => {
    if (doc.accessKey) return doc as T & { accessKey: string };
    const accessKey = newAccessKey();
    await AdminDocument.updateOne({ _id: doc._id, accessKey: { $exists: false } }, { accessKey });
    const fresh = await AdminDocument.findById(doc._id).lean();
    return { ...doc, accessKey: fresh?.accessKey ?? accessKey };
};

/** Short-lived Cloudinary API link to the stored file, used server side only. */
export const cloudinaryDownloadUrl = (doc: Pick<IAdminDocument, 'publicId'>) =>
    cloudinary.utils.private_download_url(doc.publicId, '', {
        resource_type: 'raw',
        type: 'authenticated',
        expires_at: Math.floor(Date.now() / 1000) + 60,
    });

const toDto = (doc: IAdminDocument & { _id: unknown }) => ({
    id: String(doc._id),
    title: doc.title,
    fileName: doc.fileName,
    bytes: doc.bytes,
    createdAt: doc.createdAt,
    url: pdfLinkPath(doc),
});

export const listAdminDocuments = async () => {
    const docs = await AdminDocument.find().sort({ createdAt: -1 }).lean();
    return Promise.all(docs.map(async (d) => toDto(await withAccessKey(d))));
};

export const getAdminDocument = async (id: string) => {
    if (!isValidObjectId(id)) throw new VerificationError('Document not found', 404);
    const doc = await AdminDocument.findById(id).lean();
    if (!doc) throw new VerificationError('Document not found', 404);
    return toDto(await withAccessKey(doc));
};
