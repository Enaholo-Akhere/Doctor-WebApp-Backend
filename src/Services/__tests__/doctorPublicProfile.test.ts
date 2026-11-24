import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Request, Response } from 'express';

import Doctor from 'models/DoctorSchema';
import 'models/ReviewSchema'; // registers Review, which profiles populate
import { slugify } from '@utils/doctorSlug';
import { ensureDoctorSlugs, getDoctorByIdService, getDoctorService, updateDoctorService } from 'Services/doctorService';
import { getDoctorById } from 'Controllers/doctorController';

let mongo: MongoMemoryServer;
beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60_000 } });
    await mongoose.connect(mongo.getUri());
    await Doctor.init(); // build the unique slug index
}, 120_000);
afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
});
afterEach(async () => {
    await Doctor.deleteMany({});
});

let n = 0;
const createDoctor = (fields: Record<string, unknown> = {}) =>
    new Doctor({
        email: `doc${++n}@example.com`,
        password: 'hashed',
        phone: '+2348000000000',
        name: 'Ada Obi',
        specialization: 'cardiologist',
        photo: { imageUrl: 'https://example.com/a.jpg', publicId: 'a' },
        ...fields,
    }).save();

const asPlain = (data: unknown) => JSON.parse(JSON.stringify(data));

describe('slugify', () => {
    it('builds a readable, URL-safe slug', () => {
        expect(slugify('Ada Obi', 'Cardiologist')).toBe('ada-obi-cardiologist');
        expect(slugify('Dr. Adaeze Ọbi', 'Paediatrics & Child Health')).toBe('adaeze-obi-paediatrics-child-health');
        expect(slugify('  Farid   Hassana ', undefined)).toBe('farid-hassana');
    });

    it('caps the length without a trailing hyphen', () => {
        const slug = slugify('a'.repeat(79) + ' b');
        expect(slug.length).toBeLessThanOrEqual(80);
        expect(slug.endsWith('-')).toBe(false);
    });
});

describe('doctor slugs', () => {
    it('gives a new doctor a slug and de-duplicates clashes', async () => {
        const first = await createDoctor();
        const second = await createDoctor();
        expect(first.slug).toBe('ada-obi-cardiologist');
        expect(second.slug).toBe('ada-obi-cardiologist-2');
    });

    it('updates the slug when the name or specialty changes', async () => {
        const doctor = await createDoctor();
        const { data } = await updateDoctorService({ id: String(doctor._id), userData: { specialization: 'neurologist' } });
        expect(asPlain(data).slug).toBe('ada-obi-neurologist');

        // Saving the same values again keeps the slug instead of adding "-2".
        const again = await updateDoctorService({ id: String(doctor._id), userData: { specialization: 'neurologist' } });
        expect(asPlain(again.data).slug).toBe('ada-obi-neurologist');
    });

    it('leaves the slug alone for edits that do not affect it', async () => {
        const doctor = await createDoctor();
        const { data } = await updateDoctorService({ id: String(doctor._id), userData: { bio: 'Heart specialist' } });
        expect(asPlain(data).slug).toBe('ada-obi-cardiologist');
    });

    it('backfills doctors created before slugs existed', async () => {
        await Doctor.collection.insertMany([
            { email: 'old1@example.com', password: 'x', name: 'Faith Osemwengie', specialization: 'optometrist' },
            { email: 'old2@example.com', password: 'x', name: 'Faith Osemwengie', specialization: 'optometrist' },
        ]);
        expect(await ensureDoctorSlugs()).toBe(2);
        const slugs = (await Doctor.find().lean()).map((d) => d.slug).sort();
        expect(slugs).toEqual(['faith-osemwengie-optometrist', 'faith-osemwengie-optometrist-2']);
        expect(await ensureDoctorSlugs()).toBe(0);
    });
});

describe('public doctor endpoints', () => {
    it('never return email or phone', async () => {
        const doctor = await createDoctor();
        const list = asPlain((await getDoctorService()).data);
        const one = asPlain((await getDoctorByIdService(String(doctor._id))).data);
        for (const d of [list[0], one]) {
            expect(d).not.toHaveProperty('email');
            expect(d).not.toHaveProperty('phone');
            expect(d).not.toHaveProperty('password');
            expect(d.name).toBe('Ada Obi');
        }
    });

    it('finds a doctor by id or by slug', async () => {
        const doctor = await createDoctor();
        expect(asPlain((await getDoctorByIdService(String(doctor._id))).data)._id).toBe(String(doctor._id));
        expect(asPlain((await getDoctorByIdService('ada-obi-cardiologist')).data)._id).toBe(String(doctor._id));
        expect(asPlain((await getDoctorByIdService('ADA-OBI-CARDIOLOGIST')).data)._id).toBe(String(doctor._id));
    });

    it('responds 404 for an unknown id or slug', async () => {
        for (const id of [new mongoose.Types.ObjectId().toString(), 'no-such-doctor', 'abc']) {
            const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
            const next = vi.fn();
            await getDoctorById({ params: { id } } as unknown as Request, res, next);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(next).not.toHaveBeenCalled();
        }
    });
});
