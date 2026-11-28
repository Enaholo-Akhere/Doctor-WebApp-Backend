/**
 * Store a PDF that only admins can open from the dashboard.
 *
 *   npm run add-admin-pdf -- "/path/to/file.pdf" ["Title"]
 *
 * Uploads it to Cloudinary (authenticated, no public URL) and creates an
 * AdminDocument record. Uses MONGO_URI and CLOUDINARY_* from .env.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import AdminDocument from 'models/AdminDocumentSchema';
import { pdfLinkPath, uploadAdminPdf } from 'Services/adminDocumentService';

const main = async () => {
    const [filePath, title] = process.argv.slice(2);
    if (!filePath) throw new Error('Usage: npm run add-admin-pdf -- <file.pdf> [title]');
    const buffer = fs.readFileSync(filePath);
    if (buffer.subarray(0, 5).toString() !== '%PDF-') throw new Error(`${filePath} is not a PDF`);

    const fileName = path.basename(filePath);
    await mongoose.connect(process.env.MONGO_URI as string);
    const uploaded = await uploadAdminPdf(buffer, fileName);
    const doc = await AdminDocument.create({
        title: title || fileName.replace(/\.pdf$/i, ''),
        fileName,
        publicId: uploaded.public_id,
        version: uploaded.version,
        bytes: uploaded.bytes,
    });
    console.log(`Created AdminDocument ${doc._id}`);
    console.log(`Permanent link (relative to /api/v1): ${pdfLinkPath(doc)}`);
};

main()
    .catch((e) => {
        console.error(e.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
