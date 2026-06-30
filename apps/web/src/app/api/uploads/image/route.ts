import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireAuth } from '@/lib/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;

    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Only JPEG, PNG, WebP, and AVIF images are allowed' }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET_PRODUCTS;
    const publicUrl = process.env.R2_PUBLIC_URL;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      return NextResponse.json({ error: 'R2 storage not configured' }, { status: 500 });
    }

    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    const ext = file.name.split('.').pop() || 'jpg';
    const hash = crypto.randomBytes(8).toString('hex');
    const key = `products/${Date.now()}-${hash}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }));

    const url = publicUrl ? `${publicUrl}/${key}` : `https://${bucket}.r2.dev/${key}`;

    return NextResponse.json({ data: { url, key, filename: file.name, size: file.size, contentType: file.type } });
  } catch (error) {
    console.error('Error uploading image:', (error as Error).message);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
