import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { uploadsPath } from '../config.js';
import { ApiError } from '../utils/apiError.js';
const receive = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 30 },
}).single('photo');
export const upload = [
  receive,
  async (req, res, next) => {
    if (!req.file) return next();
    const bytes = req.file.buffer;
    const png = bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp =
      bytes.toString('ascii', 0, 4) === 'RIFF' &&
      bytes.toString('ascii', 8, 12) === 'WEBP';
    if (!png && !jpeg && !webp)
      throw new ApiError(400, 'Choose a PNG, JPEG or WebP photograph');
    const filename = `${randomUUID()}.${png ? 'png' : jpeg ? 'jpg' : 'webp'}`;
    await mkdir(uploadsPath, { recursive: true });
    const target = path.join(uploadsPath, filename);
    await writeFile(target, bytes);
    req.imageUrl = `/uploads/${filename}`;
    res.on('finish', () => {
      if (res.statusCode >= 400) unlink(target).catch(() => {});
    });
    next();
  },
];
