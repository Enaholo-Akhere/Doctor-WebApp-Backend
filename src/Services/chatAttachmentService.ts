import multer from 'multer';
import type { UploadApiResponse } from 'cloudinary';
import cloudinary from 'config/cloudinaryConfig';
import { Attachment } from 'models/messages';

/**
 * Chat attachments: files (images, documents) and voice notes.
 *
 * Files are buffered in memory (bounded by MAX_FILE_BYTES) and streamed to
 * Cloudinary only after auth + the booking check pass, so rejected requests
 * never reach storage. Cloudinary assigns random public IDs, so URLs are
 * unguessable but public to anyone holding the link.
 */

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_VOICE_SECONDS = 5 * 60;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
];
// Browsers record voice notes as webm/opus (Chrome, Firefox) or mp4/aac (Safari).
const AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/wav', 'audio/x-m4a'];

export type AttachmentKind = 'file' | 'voice';

/** Strips codec params: "audio/webm;codecs=opus" -> "audio/webm". */
const baseMime = (mime: string) => mime.split(';')[0].trim().toLowerCase();

export const isAllowedMime = (mime: string, kind: AttachmentKind) => {
    const m = baseMime(mime);
    if (kind === 'voice') return AUDIO_TYPES.includes(m);
    return IMAGE_TYPES.includes(m) || DOCUMENT_TYPES.includes(m) || AUDIO_TYPES.includes(m);
};

const resourceTypeFor = (mime: string): Attachment['resourceType'] => {
    const m = baseMime(mime);
    if (IMAGE_TYPES.includes(m)) return 'image';
    if (AUDIO_TYPES.includes(m)) return 'video'; // Cloudinary stores audio as "video"
    return 'raw';
};

export const chatUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_BYTES, files: 1 },
});

/** Keeps the original name readable but safe for display/download. */
const cleanFileName = (name: string) =>
    (name || 'file')
        .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
        .trim()
        .slice(0, 120) || 'file';

export const uploadAttachment = (
    file: Express.Multer.File,
    { roomId, kind, durationSec }: { roomId: string; kind: AttachmentKind; durationSec?: number }
): Promise<Attachment> => {
    const resourceType = resourceTypeFor(file.mimetype);
    const name = cleanFileName(kind === 'voice' ? 'Voice message' : file.originalname);

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: `CareConnect/chat/${roomId}`,
                resource_type: resourceType,
                // Raw files keep their extension so downloads open correctly.
                ...(resourceType === 'raw' && { use_filename: true, unique_filename: true, filename_override: name }),
            },
            (error, result?: UploadApiResponse) => {
                if (error || !result) return reject(error ?? new Error('Upload failed'));
                const measured = typeof result.duration === 'number' ? result.duration : undefined;
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                    resourceType,
                    name,
                    mimeType: baseMime(file.mimetype),
                    size: file.size,
                    ...(kind === 'voice' && {
                        durationSec: Math.min(Math.round(measured ?? durationSec ?? 0), MAX_VOICE_SECONDS),
                    }),
                    ...(result.width && result.height && { width: result.width, height: result.height }),
                });
            }
        );
        stream.end(file.buffer);
    });
};
