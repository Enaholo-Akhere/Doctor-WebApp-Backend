// utils/validateAvatarFile.ts
import { appError } from "@utils/appError";

export const validateAvatarFile = (file?: Express.Multer.File) => {
    if (!file) {
        throw appError({
            message: "Profile image is required",
            statusCode: 400,
        });
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/jpg",
        "image/heic"
    ];

    if (!allowedTypes.includes(file.mimetype)) {
        throw appError({
            message:
                "Invalid file type. Only JPEG, PNG, and WEBP are allowed.",
            statusCode: 400,
        });
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
        throw appError({
            message: "Image too large. Maximum size is 2MB.",
            statusCode: 400,
        });
    }
};