import multer from "multer";

const storage = multer.memoryStorage();

export const audioUpload = multer({
    storage,
    limits: {
        fileSize: 25 * 1024 * 1024,
    },
});