import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinaryConfig";

const storage = new CloudinaryStorage({
    cloudinary,
    params: async () => ({
        folder: "MedicarePhoto",
        transformation: [
            { width: 500, height: 500, crop: "limit" },
            { quality: 'auto', fetch_format: 'auto' }],
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    }),
});

export const upload = multer({
    storage,
    limits: {
        fileSize: 2 * 1024 * 1024,
    }
})