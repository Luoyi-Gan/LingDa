import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { access, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ERROR_CODES } from '../common/constants/error-codes';
import { BusinessException } from '../common/exceptions/business.exception';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function detectImageExtension(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return '.jpg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png';
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))) return '.gif';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return '.webp';
  return null;
}

type UploadedImage = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Controller('uploads')
export class UploadController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Post('images')
  @UseInterceptors(
    FilesInterceptor('files', 9, {
      limits: { fileSize: MAX_IMAGE_SIZE, files: 9 },
      fileFilter: (_request, file, callback) => {
        if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
          callback(new BadRequestException('仅支持 JPG、PNG、WebP 或 GIF 图片'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async uploadImages(@UploadedFiles() files: UploadedImage[] = []) {
    if (files.length === 0) throw new BadRequestException('请选择需要上传的图片');

    const verifiedFiles = this.verifyImages(files);

    const targetDirectory = join(this.publicUploadDirectory(), 'images');
    await mkdir(targetDirectory, { recursive: true });

    const uploaded = await Promise.all(
      verifiedFiles.map(async ({ file, extension }) => {
        const filename = `${randomUUID()}${extension}`;
        await writeFile(join(targetDirectory, filename), file.buffer, { flag: 'wx' });
        return {
          name: file.originalname.replace(/[\r\n]/g, '').slice(0, 180),
          path: `/uploads/images/${filename}`,
          size: file.size,
        };
      }),
    );

    return { files: uploaded };
  }

  @Post('verification-materials')
  @UseInterceptors(
    FilesInterceptor('files', 8, {
      limits: { fileSize: MAX_IMAGE_SIZE, files: 8 },
      fileFilter: (_request, file, callback) => {
        if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
          callback(new BadRequestException('认证材料仅支持 JPG、PNG、WebP 或 GIF 图片'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async uploadVerificationMaterials(
    @CurrentUser('userId') userId: string,
    @UploadedFiles() files: UploadedImage[] = [],
  ) {
    if (files.length === 0) throw new BadRequestException('请选择需要上传的认证材料');
    if (!/^[A-Za-z0-9_-]+$/.test(userId)) {
      throw new BusinessException(ERROR_CODES.VALIDATION_FAILED, '用户标识不合法');
    }
    const verifiedFiles = this.verifyImages(files);
    const targetDirectory = join(this.privateUploadDirectory(), 'verification', userId);
    await mkdir(targetDirectory, { recursive: true, mode: 0o700 });

    const uploaded = await Promise.all(
      verifiedFiles.map(async ({ file, extension }) => {
        const filename = `${randomUUID()}${extension}`;
        await writeFile(join(targetDirectory, filename), file.buffer, { flag: 'wx', mode: 0o600 });
        return {
          name: file.originalname.replace(/[\r\n]/g, '').slice(0, 180),
          path: `/uploads/verification-materials/${userId}/${filename}`,
          size: file.size,
        };
      }),
    );
    return { files: uploaded };
  }

  @Get('verification-materials/:ownerId/:filename')
  async readVerificationMaterial(
    @CurrentUser('userId') requesterId: string,
    @Param('ownerId') ownerId: string,
    @Param('filename') filename: string,
    @Res() response: Response,
  ) {
    if (!/^[A-Za-z0-9_-]+$/.test(ownerId) || !/^[a-f0-9-]+\.(jpg|png|webp|gif)$/.test(filename)) {
      throw new BusinessException(ERROR_CODES.NOT_FOUND, '认证材料不存在');
    }
    if (requesterId !== ownerId) {
      const requester = await this.prisma.user.findUnique({
        where: { userId: requesterId },
        select: { accountRole: true, accountStatus: true },
      });
      if (requester?.accountRole !== 'admin' || requester.accountStatus !== 'normal') {
        throw new BusinessException(ERROR_CODES.FORBIDDEN, '无权查看该认证材料');
      }
    }

    const filePath = join(this.privateUploadDirectory(), 'verification', ownerId, filename);
    try {
      await access(filePath);
    } catch {
      throw new BusinessException(ERROR_CODES.NOT_FOUND, '认证材料不存在');
    }
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    return response.sendFile(filePath);
  }

  private verifyImages(files: UploadedImage[]) {
    return files.map((file) => {
      const extension = detectImageExtension(file.buffer);
      if (!extension || extension !== MIME_EXTENSION[file.mimetype]) {
        throw new BadRequestException('图片内容与文件格式不匹配');
      }
      return { file, extension };
    });
  }

  private publicUploadDirectory() {
    return this.config.get<string>('storage.publicDir') || join(process.cwd(), 'uploads');
  }

  private privateUploadDirectory() {
    return this.config.get<string>('storage.privateDir') || join(process.cwd(), 'private-uploads');
  }
}
