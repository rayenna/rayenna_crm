import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient, UserRole } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';

const router = express.Router();
const prisma = new PrismaClient();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

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
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '26214400'), // 25MB default
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
router.get('/project/:projectId', authenticate, async (req: AuthRequest, res) => {
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
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { projectId } = req.params;
      const { category, description } = req.body;

      // Validate category
      const validCategories = ['photos_videos', 'documents', 'sheets'];
      if (!category || !validCategories.includes(category)) {
        // Delete uploaded file
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          error: `Invalid category. Must be one of: ${validCategories.join(', ')}` 
        });
      }

      // Verify project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        // Delete uploaded file
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Project not found' });
      }

      // Store relative path from uploads directory for easier serving
      const relativePath = path.relative(uploadsDir, req.file.path).replace(/\\/g, '/');
      
      const document = await prisma.document.create({
        data: {
          projectId,
          fileName: req.file.originalname,
          filePath: relativePath, // Store relative path
          fileType: req.file.mimetype,
          fileSize: req.file.size,
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
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete document (only by uploader or admin)
router.delete(
  '/:id',
  authenticate,
  async (req: AuthRequest, res) => {
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

      // Delete file from filesystem (convert relative path to absolute if needed)
      const filePath = path.isAbsolute(document.filePath) 
        ? document.filePath 
        : path.join(uploadsDir, document.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
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

// View/Download document (only by uploader, admin, or management)
router.get(
  '/:id/download',
  authenticate,
  async (req: AuthRequest, res) => {
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

      // Check if user is admin, management, or the uploader
      const isAdmin = req.user?.role === UserRole.ADMIN;
      const isManagement = req.user?.role === UserRole.MANAGEMENT;
      const isUploader = document.uploadedById === req.user?.id;

      if (!isAdmin && !isManagement && !isUploader) {
        return res.status(403).json({ 
          error: 'You do not have permission to view/download this document. Only the uploader, admin, or management can access it.' 
        });
      }

      // Get file path (handle both absolute and relative paths)
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
      res.setHeader('Content-Disposition', isDownload 
        ? `attachment; filename="${encodeURIComponent(document.fileName)}"`
        : `inline; filename="${encodeURIComponent(document.fileName)}"`);
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
    } catch (error: any) {
      console.error('Error in download endpoint:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  }
);

export default router;
