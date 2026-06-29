import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';

const router: Router = Router();

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and AVIF images are allowed'));
    }
  },
});

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

// POST /api/uploads/image — upload a product image to R2
router.post(
  '/image',
  requireAuth,
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err.message || 'Upload error' });
        return;
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'No image file provided' });
        return;
      }

      const client = getR2Client();
      const bucket = process.env.R2_BUCKET_PRODUCTS;
      const publicUrl = process.env.R2_PUBLIC_URL;

      if (!client || !bucket) {
        res.status(500).json({ error: 'R2 storage not configured' });
        return;
      }

      // Generate unique filename
      const ext = path.extname(file.originalname) || '.jpg';
      const hash = crypto.randomBytes(8).toString('hex');
      const key = `products/${Date.now()}-${hash}${ext}`;

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );

      const url = publicUrl ? `${publicUrl}/${key}` : `https://${bucket}.r2.dev/${key}`;

      res.json({
        data: {
          url,
          key,
          filename: file.originalname,
          size: file.size,
          contentType: file.mimetype,
        },
      });
    } catch (error) {
      console.error('Error uploading image:', (error as Error).message);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  }
);

export default router;
