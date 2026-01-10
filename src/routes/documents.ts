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

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
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

// Upload document
router.post(
  '/project/:projectId',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS, UserRole.FINANCE),
  upload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { projectId } = req.params;
      const { category, description } = req.body;

      // Verify project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        // Delete uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Project not found' });
      }

      const document = await prisma.document.create({
        data: {
          projectId,
          fileName: req.file.originalname,
          filePath: req.file.path,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
          category: category || 'other',
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

// Delete document
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS),
  async (req: AuthRequest, res) => {
    try {
      const document = await prisma.document.findUnique({
        where: { id: req.params.id },
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Delete file from filesystem
      if (fs.existsSync(document.filePath)) {
        fs.unlinkSync(document.filePath);
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

export default router;
