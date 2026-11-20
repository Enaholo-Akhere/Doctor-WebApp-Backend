/**
 * Removes personal identifiers from text before it is sent to the LLM or
 * stored: emails, phone numbers and ID-style numbers (national IDs such as
 * NIN/BVN/SSN/NHS numbers, passport numbers, card numbers).
 *
 * Health numbers are deliberately kept: blood pressure (120/80), doses
 * (500 mg), weights, temperatures, ages, counts and dates.
 */

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

// US SSN style 123-45-6789.
const SSN = /\b\d{3}-\d{2}-\d{4}\b/g;

// Passport-style: 1-2 letters followed by 6-9 digits (e.g. A12345678).
const PASSPORT = /\b[A-Z]{1,2}\d{6,9}\b/g;

// Dates are not identifiers: protect YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY.
const DATE = /\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})\b/g;

/**
 * Phone numbers and long ID/card numbers: an optional "+", then digits with
 * optional spaces, dots, dashes or brackets, totalling 7 or more digits.
 * (Blood pressure "120/80" and doses "500 mg" never reach 7 digits.)
 */
const LONG_NUMBER = /(?:\+|\()?\b\d[\d\s().-]{5,}\d\b/g;

const digitCount = (s: string) => (s.match(/\d/g) || []).length;

export const scrubPii = (text: string): string => {
    // Shield dates so the long-number rule can't touch them.
    const dates: string[] = [];
    let out = text.replace(DATE, (m) => `\u0000${dates.push(m) - 1}\u0000`);

    out = out
        .replace(EMAIL, '[email removed]')
        .replace(SSN, '[ID removed]')
        .replace(PASSPORT, '[ID removed]')
        .replace(LONG_NUMBER, (m) => {
            const digits = digitCount(m);
            if (digits < 7) return m;
            // Phone-shaped (leading +, or 0 followed by 9-10 digits, or grouped) vs plain ID.
            const looksLikePhone = /^[+(]/.test(m.trim()) || /[\s().-]/.test(m.trim()) || /^0\d{9,10}$/.test(m.trim());
            return looksLikePhone && digits <= 15 ? '[phone removed]' : '[ID removed]';
        });

    return out.replace(/\u0000(\d+)\u0000/g, (_, i) => dates[Number(i)]);
};

/** True if anything was removed (for metadata-only logging). */
export const containsPii = (text: string) => scrubPii(text) !== text;
