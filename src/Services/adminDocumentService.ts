import jwt from 'jsonwebtoken';
import { isValidObjectId } from 'mongoose';
import { ISSUER } from 'config/constant';
import cloudinary from 'config/cloudinaryConfig';
import AdminDocument, { IAdminDocument } from 'models/AdminDocumentSchema';
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

/** How long a document link handed to an admin keeps working. */
export const ADMIN_DOC_LINK_TTL_SECONDS = 10 * 60;
const FILE_TOKEN_AUDIENCE = 'admin-document-file';

const privateKey = () => process.env.PRIVATE_KEY?.replace(/\\n/g, '\n') as string;
const publicKey = () => process.env.PUBLIC_KEY?.replace(/\\n/g, '\n') as string;

/**
 * A link to the file that ends in .pdf and needs no auth header, so an
 * <iframe> or react-pdf can load it as is. The short-lived token in the path
 * is the permission: only the admin-only endpoints below hand one out, and
 * its audience is not a login audience, so it can't be used as an access token.
 * The path is relative to the API root (/api/v1).
 */
export const pdfLinkPath = (doc: { _id: unknown; fileName: string }) => {
    const token = jwt.sign({ sub: String(doc._id) }, privateKey(), {
        algorithm: 'RS256',
        audience: FILE_TOKEN_AUDIENCE,
        issuer: ISSUER,
        expiresIn: ADMIN_DOC_LINK_TTL_SECONDS,
    });
    const name = /\.pdf$/i.test(doc.fileName) ? doc.fileName : `${doc.fileName}.pdf`;
    return `/files/admin-documents/${token}/${encodeURIComponent(name)}`;
};

/** Checks a link token and returns the document it opens. */
export const documentForToken = async (token: string) => {
    let id: string | undefined;
    try {
        id = (jwt.verify(token, publicKey(), { algorithms: ['RS256'], audience: FILE_TOKEN_AUDIENCE, issuer: ISSUER }) as jwt.JwtPayload).sub;
    } catch {
        throw new VerificationError('This link has expired. Open the document again from the dashboard.', 403);
    }
    const doc = id && isValidObjectId(id) ? await AdminDocument.findById(id).lean() : null;
    if (!doc) throw new VerificationError('Document not found', 404);
    return doc;
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
    expiresInSeconds: ADMIN_DOC_LINK_TTL_SECONDS,
});

export const listAdminDocuments = async () => {
    const docs = await AdminDocument.find().sort({ createdAt: -1 }).lean();
    return docs.map(toDto);
};

export const getAdminDocument = async (id: string) => {
    if (!isValidObjectId(id)) throw new VerificationError('Document not found', 404);
    const doc = await AdminDocument.findById(id).lean();
    if (!doc) throw new VerificationError('Document not found', 404);
    return toDto(doc);
};
