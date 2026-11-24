/**
 * Documents doctors submit to be verified before they're listed and
 * bookable. Edit this list (e.g. after legal review) rather than the code.
 */
export const DOCUMENT_KINDS = [
    'government_id',
    'practising_licence',
    'registration_certificate',
    'medical_degree',
    'specialist_certificate',
    'indemnity_insurance',
    'cv',
] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const DOCUMENT_LABELS: Record<DocumentKind, string> = {
    government_id: 'Government photo ID',
    practising_licence: 'Current practising licence',
    registration_certificate: 'Full registration certificate',
    medical_degree: 'Medical degree certificate',
    specialist_certificate: 'Specialist certification',
    indemnity_insurance: 'Indemnity / malpractice insurance',
    cv: 'CV',
};

/** A doctor can't be approved until each of these is uploaded and not rejected. */
export const REQUIRED_KINDS: DocumentKind[] = ['government_id', 'practising_licence', 'medical_degree'];

/** These must carry an expiry date. An approved doctor whose licence lapses is unlisted automatically. */
export const KINDS_REQUIRING_EXPIRY: DocumentKind[] = ['practising_licence'];

/** Uploads: PDFs or photos/scans, up to 5 MB. */
export const DOCUMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

/** How long an admin's "view document" link works. */
export const DOCUMENT_LINK_TTL_SECONDS = 10 * 60;

/** Email the doctor this many days before their practising licence expires. */
export const LICENCE_REMINDER_DAYS = 30;
