import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { UserRole } from '@prisma/client';
import prisma from '../prisma';
import { authenticate, authorize } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';
import { v2 as cloudinary } from 'cloudinary';
// Removed CloudinaryStorage - now using upload_stream with memoryStorage for better reliability

const router = express.Router();

// Cloudinary configuration (optional - only if env vars are set)
const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('✅ Cloudinary configured:', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY ? '***' + process.env.CLOUDINARY_API_KEY.slice(-4) : 'missing',
    api_secret: process.env.CLOUDINARY_API_SECRET ? '***' + process.env.CLOUDINARY_API_SECRET.slice(-4) : 'missing',
  });
} else {
  console.warn('⚠️ Cloudinary not configured - using local file storage. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables to enable Cloudinary.');
}

// Ensure uploads directory exists (for local storage fallback)
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage - use memory storage for Cloudinary (upload_stream), disk storage for local
let storage: multer.StorageEngine;

if (useCloudinary) {
  // Use memory storage when Cloudinary is enabled - we'll upload buffer using upload_stream
  storage = multer.memoryStorage();
} else {
  // Local disk storage (development fallback)
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    },
  });
}

// Blocked file extensions (executables, macros, archives)
const blockedExtensions = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
  '.msi', '.dll', '.app', '.deb', '.rpm', '.dmg', '.pkg',
  '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.iso',
  '.docm', '.xlsm', '.pptm', // Office files with macros
];

const upload = multer({
  storage,
  limits: {
    // 10MB per file by default (can be overridden via MAX_FILE_SIZE env)
    fileSize: parseInt(process.env.MAX_FILE_SIZE || String(10 * 1024 * 1024)),
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Block executables, macros, and archives
    if (blockedExtensions.includes(ext)) {
      return cb(new Error(`File type not allowed: ${ext}. Executables, macros, and archive files are not permitted.`));
    }

    // Allow common document types (PDF, images, Office documents without macros)
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/gif',
      'image/webp',
      'image/bmp',
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only documents, images, videos, and spreadsheets are allowed.`));
    }
  },
});

// Get documents for a project
router.get('/project/:projectId', authenticate, async (req: Request, res) => {
  try {
    const { projectId } = req.params;

    // Verify project exists and user has access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const documents = await prisma.document.findMany({
      where: { projectId },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(documents);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Upload document (Sales and Operations only)
router.post(
  '/project/:projectId',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS),
  upload.single('file'),
  async (req: Request, res) => {
    // Declare variables outside try block so they're accessible in catch block
    let cloudinaryPublicId: string | undefined;
    
    try {
      // Debug logging for upload issues
      console.log('📤 Upload request received:', {
        hasFile: !!req.file,
        contentType: req.headers['content-type'],
        method: req.method,
        bodyKeys: Object.keys(req.body || {}),
        fileField: req.file ? {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          hasBuffer: !!req.file.buffer,
        } : null,
      });

      if (!req.file) {
        console.error('❌ No file in request. Multer did not process file.');
        console.error('Request details:', {
          headers: req.headers,
          body: req.body,
          files: (req as any).files,
        });
        return res.status(400).json({ error: 'No file uploaded. Please ensure a file is selected and try again.' });
      }

      const { projectId } = req.params;
      const { category, description } = req.body;

      // Validate category first (before uploading to Cloudinary if needed)
      const validCategories = ['photos_videos', 'documents', 'sheets'];
      if (!category || !validCategories.includes(category)) {
        return res.status(400).json({ 
          error: `Invalid category. Must be one of: ${validCategories.join(', ')}` 
        });
      }

      // Verify project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Enforce maximum number of files per project (10)
      const existingCount = await prisma.document.count({
        where: { projectId },
      });
      if (existingCount >= 10) {
        return res.status(400).json({
          error: 'Maximum of 10 files per project reached. Please delete an existing file before uploading a new one.',
        });
      }

      // Handle file path/URL based on storage type
      let filePath: string;
      let fileSize: number;
      
      if (useCloudinary) {
        // Upload buffer to Cloudinary using upload_stream (more reliable method)
        if (!req.file.buffer) {
          return res.status(400).json({ error: 'File buffer not available for Cloudinary upload' });
        }

        try {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const uploadResult = await new Promise<any>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: 'rayenna_crm',
                public_id: `file-${uniqueSuffix}`,
                resource_type: 'auto', // Automatically detect image, video, raw
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            uploadStream.end(req.file.buffer);
          });

          filePath = uploadResult.secure_url;
          fileSize = uploadResult.bytes || req.file.size || 0;
          cloudinaryPublicId = uploadResult.public_id;
          
          console.log('✅ File uploaded to Cloudinary:', {
            fileName: req.file.originalname,
            url: filePath,
            publicId: cloudinaryPublicId,
          });
        } catch (uploadError: any) {
          console.error('❌ Cloudinary upload failed:', uploadError);
          return res.status(500).json({ 
            error: 'Failed to upload file to Cloudinary',
            details: uploadError.message,
          });
        }
      } else {
        // Local storage - store relative path
        if (!req.file.path) {
          return res.status(400).json({ error: 'File path not available for local storage' });
        }
        filePath = path.relative(uploadsDir, req.file.path).replace(/\\/g, '/');
        fileSize = req.file.size;
      }
      
      const document = await prisma.document.create({
        data: {
          projectId,
          fileName: req.file.originalname,
          filePath: filePath, // Either Cloudinary URL or relative local path
          fileType: req.file.mimetype,
          fileSize: fileSize,
          category: category,
          description,
          uploadedById: req.user!.id,
        },
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Create audit log
      await createAuditLog({
        projectId,
        userId: req.user!.id,
        action: 'document_uploaded',
        field: 'documents',
        newValue: req.file.originalname,
        remarks: `Document uploaded: ${category || 'other'}`,
      });

      res.status(201).json(document);
    } catch (error: any) {
      // Cleanup on error - delete from Cloudinary if upload succeeded but DB insert failed
      if (useCloudinary && cloudinaryPublicId) {
        try {
          await cloudinary.uploader.destroy(cloudinaryPublicId);
          console.log('✅ Cleaned up Cloudinary file after error:', cloudinaryPublicId);
        } catch (cleanupError) {
          console.error('❌ Error cleaning up Cloudinary file:', cleanupError);
        }
      } else if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        // Local storage cleanup
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error('❌ Error cleaning up local file:', cleanupError);
        }
      }
      
      console.error('❌ Document upload error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to upload document',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }
);

// Delete document (only by uploader or admin)
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res) => {
    try {
      const document = await prisma.document.findUnique({
        where: { id: req.params.id },
        include: {
          uploadedBy: {
            select: { id: true },
          },
        },
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Check if this is an AI Generated Proposal PDF (only admin can delete)
      const isProposalPDF = document.description === 'AI Generated Proposal PDF';
      const isAdmin = req.user?.role === UserRole.ADMIN;
      const isUploader = document.uploadedById === req.user?.id;

      // For AI Generated Proposal PDFs, only admin can delete
      if (isProposalPDF && !isAdmin) {
        return res.status(403).json({ 
          error: 'You do not have permission to delete this document. Only admin can delete AI Generated Proposal PDFs.' 
        });
      }

      // For other documents, admin or uploader can delete
      if (!isProposalPDF && !isAdmin && !isUploader) {
        return res.status(403).json({ 
          error: 'You do not have permission to delete this document. Only the uploader or admin can delete it.' 
        });
      }

      // Delete file based on storage type
      if (useCloudinary && document.filePath.startsWith('http')) {
        // Cloudinary URL - extract public_id and delete from Cloudinary
        try {
          const publicIdMatch = document.filePath.match(/\/v\d+\/(.+)\./);
          if (publicIdMatch) {
            const publicId = publicIdMatch[1].replace(/rayenna-crm\//, '');
            await cloudinary.uploader.destroy(`rayenna-crm/${publicId}`);
          }
        } catch (error: any) {
          console.error('Error deleting from Cloudinary:', error);
          // Continue with database deletion even if Cloudinary deletion fails
        }
      } else {
        // Local storage - delete from filesystem
        const filePath = path.isAbsolute(document.filePath) 
          ? document.filePath 
          : path.join(uploadsDir, document.filePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // Delete from database
      await prisma.document.delete({
        where: { id: req.params.id },
      });

      // Create audit log
      await createAuditLog({
        projectId: document.projectId,
        userId: req.user!.id,
        action: 'document_deleted',
        field: 'documents',
        oldValue: document.fileName,
        remarks: 'Document deleted',
      });

      res.json({ message: 'Document deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// View/Download document (admin, management, sales, operations, finance, or uploader)
router.get(
  '/:id/download',
  authenticate,
  async (req: Request, res) => {
    try {
      const document = await prisma.document.findUnique({
        where: { id: req.params.id },
        include: {
          uploadedBy: {
            select: { id: true },
          },
        },
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Check if user has permission to view/download the document
      // Allow: ADMIN, MANAGEMENT, SALES (only their projects), OPERATIONS, FINANCE, or the uploader
      const isAdmin = req.user?.role === UserRole.ADMIN;
      const isManagement = req.user?.role === UserRole.MANAGEMENT;
      const isSales = req.user?.role === UserRole.SALES;
      const isOperations = req.user?.role === UserRole.OPERATIONS;
      const isFinance = req.user?.role === UserRole.FINANCE;
      const isUploader = document.uploadedById === req.user?.id;

      // For Sales users, check if they have access to the project
      let salesHasAccess = false;
      if (isSales) {
        const project = await prisma.project.findUnique({
          where: { id: document.projectId },
          select: { salespersonId: true },
        });
        salesHasAccess = project?.salespersonId === req.user?.id;
      }

      if (
        !isAdmin &&
        !isManagement &&
        !(isSales && salesHasAccess) &&
        !isOperations &&
        !isFinance &&
        !isUploader
      ) {
        return res.status(403).json({
          error:
            'You do not have permission to view/download this document. Only authorized roles or the uploader can access it.',
        });
      }

      // Handle file retrieval based on storage type
      // If the stored path is a full URL (e.g. Cloudinary), redirect the client to a
      // signed Cloudinary URL. The browser then opens/downloads the PDF directly.
      if (document.filePath.startsWith('http')) {
        // Remote URL (typically Cloudinary)
        const isDownload = req.query.download === 'true';

        try {
          let redirectUrl = document.filePath;

          // If Cloudinary is configured and the URL points to Cloudinary, generate a
          // signed private download URL for PDFs using resource_type "raw".
          if (useCloudinary && redirectUrl.includes('res.cloudinary.com')) {
            try {
              const urlObj = new URL(redirectUrl);
              const segments = urlObj.pathname.split('/').filter(Boolean);
              const uploadIndex = segments.findIndex((s) => s === 'upload');

              if (uploadIndex !== -1) {
                // Everything after /upload/ is publicId + extension
                const publicAndFile = segments.slice(uploadIndex + 1).join('/');
                const lastDot = publicAndFile.lastIndexOf('.');
                const publicId =
                  lastDot !== -1 ? publicAndFile.substring(0, lastDot) : publicAndFile;
                const format =
                  lastDot !== -1 ? publicAndFile.substring(lastDot + 1) : undefined;

                const signedUrl = cloudinary.utils.private_download_url(publicId, format, {
                  resource_type: 'raw',
                  attachment: !!isDownload,
                });

                redirectUrl = signedUrl;
              }
            } catch (parseError: any) {
              console.error(
                'Error generating Cloudinary signed URL, falling back to stored URL:',
                {
                  message: parseError?.message,
                  url: document.filePath,
                }
              );
            }
          }

          return res.redirect(redirectUrl);
        } catch (remoteError: any) {
          console.error('Error preparing remote document redirect:', {
            message: remoteError?.message,
            url: document.filePath,
          });
          // As per constraints, avoid JSON here; send minimal text response.
          if (!res.headersSent) {
            res.status(500).send('Failed to open document');
          }
          return;
        }
      } else {
        // Local storage - stream from filesystem
        const filePath = path.isAbsolute(document.filePath)
          ? document.filePath
          : path.join(uploadsDir, document.filePath);

        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: 'File not found on server' });
        }

        // Determine content type
        const contentType = document.fileType || 'application/octet-stream';

        // Check if it's a download request (query param) or view request
        const isDownload = req.query.download === 'true';

        // Set headers for file download/view
        res.setHeader('Content-Type', contentType);
        res.setHeader(
          'Content-Disposition',
          isDownload
            ? `attachment; filename="${encodeURIComponent(document.fileName)}"`
            : `inline; filename="${encodeURIComponent(document.fileName)}"`
        );
        res.setHeader('Content-Length', document.fileSize);

        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        // Handle errors
        fileStream.on('error', (error) => {
          console.error('Error streaming file:', error);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Error reading file' });
          }
        });
      }
    } catch (error: any) {
      console.error('Error in download endpoint:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  }
);

// Get signed URL for document (Cloudinary or local download URL)
router.get(
  '/:id/signed-url',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const document = await prisma.document.findUnique({
        where: { id: req.params.id },
        include: {
          uploadedBy: {
            select: { id: true },
          },
        },
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Reuse the same permission rules as the download endpoint
      const isAdmin = req.user?.role === UserRole.ADMIN;
      const isManagement = req.user?.role === UserRole.MANAGEMENT;
      const isSales = req.user?.role === UserRole.SALES;
      const isOperations = req.user?.role === UserRole.OPERATIONS;
      const isFinance = req.user?.role === UserRole.FINANCE;
      const isUploader = document.uploadedById === req.user?.id;

      let salesHasAccess = false;
      if (isSales) {
        const project = await prisma.project.findUnique({
          where: { id: document.projectId },
          select: { salespersonId: true },
        });
        salesHasAccess = project?.salespersonId === req.user?.id;
      }

      if (
        !isAdmin &&
        !isManagement &&
        !(isSales && salesHasAccess) &&
        !isOperations &&
        !isFinance &&
        !isUploader
      ) {
        return res.status(403).json({
          error:
            'You do not have permission to view/download this document. Only authorized roles or the uploader can access it.',
        });
      }

      const isDownload = req.query.download === 'true';

      // If Cloudinary URL, return a signed URL; otherwise, return the backend download URL
      if (document.filePath.startsWith('http') && useCloudinary && document.filePath.includes('res.cloudinary.com')) {
        let signedUrl = document.filePath;

        try {
          const urlObj = new URL(document.filePath);
          const segments = urlObj.pathname.split('/').filter(Boolean);
          const uploadIndex = segments.findIndex((s) => s === 'upload');

          if (uploadIndex !== -1) {
            const publicAndFile = segments.slice(uploadIndex + 1).join('/');
            const lastDot = publicAndFile.lastIndexOf('.');
            const publicId =
              lastDot !== -1 ? publicAndFile.substring(0, lastDot) : publicAndFile;
            const format =
              lastDot !== -1 ? publicAndFile.substring(lastDot + 1) : undefined;

            signedUrl = cloudinary.utils.private_download_url(publicId, format, {
              resource_type: 'raw',
              attachment: !!isDownload,
            });
          }
        } catch (parseError: any) {
          console.error('Error generating Cloudinary signed URL:', {
            message: parseError?.message,
            url: document.filePath,
          });
          // Fall back to original URL if parsing fails
          signedUrl = document.filePath;
        }

        return res.json({ url: signedUrl });
      }

      // Fallback for non-Cloudinary documents: use backend download route
      const downloadUrl = `/api/documents/${document.id}/download${
        isDownload ? '?download=true' : ''
      }`;
      return res.json({ url: downloadUrl });
    } catch (error: any) {
      console.error('Error generating signed URL for document:', error);
      return res.status(500).json({ error: error.message || 'Failed to generate signed URL' });
    }
  }
);

export default router;
