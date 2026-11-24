import type { Model } from 'mongoose';

/**
 * Readable, URL-safe slug for a doctor's public profile, e.g.
 * "Dr. Adaeze Ọbi" + "Cardiologist" -> "adaeze-obi-cardiologist".
 */
export const slugify = (...parts: (string | undefined)[]): string =>
    parts
        .filter(Boolean)
        .join(' ')
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '') // strip accents: "Ọ" -> "O"
        .toLowerCase()
        .replace(/^dr\.?\s+/, '') // the title isn't part of the name
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80)
        .replace(/-+$/, '');

/** 24 hex characters. Used to tell an id from a slug in /doctors/:id. */
export const isObjectIdString = (value: string) => /^[a-f0-9]{24}$/i.test(value);

/**
 * A slug no other doctor uses: the base slug, or base-2, base-3, ... when
 * taken. `excludeId` is the doctor being renamed, so it doesn't clash with itself.
 */
export const uniqueDoctorSlug = async (
    DoctorModel: Model<any>,
    name: string,
    specialization?: string,
    excludeId?: unknown,
): Promise<string> => {
    // Never empty or id-shaped, so a slug can't be mistaken for an id.
    let base = slugify(name, specialization) || 'doctor';
    if (isObjectIdString(base)) base = `doctor-${base}`;

    const taken = new Set(
        (
            await DoctorModel.find(
                { slug: { $regex: `^${base}(-\\d+)?$` }, ...(excludeId ? { _id: { $ne: excludeId } } : {}) },
                { slug: 1 },
            ).lean<{ slug: string }[]>()
        ).map((d) => d.slug),
    );

    if (!taken.has(base)) return base;
    for (let n = 2; ; n++) {
        const candidate = `${base}-${n}`;
        if (!taken.has(candidate)) return candidate;
    }
};
