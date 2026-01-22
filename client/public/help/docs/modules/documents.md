# Key Artifacts Module

## Overview

The Key Artifacts module enables you to upload, organize, store, and manage project-related documents, images, videos, and files. It provides secure cloud-based storage, organized categorization, and controlled access to ensure all project documentation is properly maintained and easily accessible.

## Uploading Documents

### Who Can Upload Documents

**Authorized Roles**:
- **Sales users**: Can upload documents to their projects
- **Operations users**: Can upload documents to any project
- **Administrators**: Can upload documents to any project

**Permissions**:
- Sales users can upload to projects assigned to them
- Operations users have broader access
- Admin users have full access

### Uploading Process

**Step 1: Access Project**
1. Go to **Projects** page
2. Find and open the project
3. Click **Edit** button (top right)
4. Scroll to **File Uploads** section

**Step 2: Select File**
1. Click **Choose File** button
2. Browse and select file from your computer
3. File name appears after selection
4. Verify file is correct

**Step 3: Choose Category**
1. Select **Category** from dropdown (required)
2. Options:
   - **Photos / Videos**: Images and video files
   - **Documents**: PDFs, Word, PowerPoint files
   - **Sheets**: Excel files, CSV files
3. Category helps organize documents

**Step 4: Add Description (Optional)**
1. Enter description in text field
2. Provide context about the document
3. Note any important information
4. Description helps others understand the file

**Step 5: Upload File**
1. Click **Upload File** button
2. Wait for upload to complete
3. Success message confirms upload
4. File appears in Key Artifacts section

### Upload Requirements

**File Selection**:
- Must select a file before uploading
- File must be valid and accessible
- Cannot upload empty files
- File must meet size and type requirements

**Category Selection**:
- Category is required
- Must select from available options
- Cannot proceed without category
- Category cannot be changed after upload

**Upload Validation**:
- System validates file type
- Checks file size limits
- Verifies file integrity
- Ensures proper format

### Upload Best Practices

**File Preparation**:
- Use descriptive file names
- Ensure files are complete
- Verify file content before upload
- Check file size before uploading

**Category Selection**:
- Choose appropriate category
- Be consistent with categorization
- Use category to organize documents
- Help others find files easily

**Description**:
- Add clear, descriptive descriptions
- Include relevant context
- Note important details
- Help others understand the file

**Timely Upload**:
- Upload documents promptly
- Don't delay file uploads
- Keep documentation current
- Maintain complete records

## Supported Formats

### Understanding File Format Support

The system supports a wide range of file formats commonly used in business and project management, while blocking potentially dangerous file types to ensure security.

### Supported File Types

**Images**:
- **JPEG/JPG**: Joint Photographic Experts Group
- **PNG**: Portable Network Graphics
- **GIF**: Graphics Interchange Format
- **WebP**: Web Picture format
- **BMP**: Bitmap image

**Documents**:
- **PDF**: Portable Document Format
- **Word**: Microsoft Word (.doc, .docx)
- **PowerPoint**: Microsoft PowerPoint (.ppt, .pptx)
- **Text**: Plain text files (.txt)

**Spreadsheets**:
- **Excel**: Microsoft Excel (.xls, .xlsx)
- **CSV**: Comma-separated values

**Videos**:
- **MP4**: MPEG-4 video
- **MPEG**: Moving Picture Experts Group
- **QuickTime**: Apple QuickTime (.mov)
- **AVI**: Audio Video Interleave

### Blocked File Types

**Security Restrictions**:
The system blocks potentially dangerous file types to protect against security threats:

**Executables**:
- .exe, .bat, .cmd, .com, .pif, .scr, .vbs, .js, .jar
- .msi, .dll, .app, .deb, .rpm, .dmg, .pkg

**Archives**:
- .zip, .rar, .7z, .tar, .gz, .bz2, .xz, .iso

**Office Files with Macros**:
- .docm (Word with macros)
- .xlsm (Excel with macros)
- .pptm (PowerPoint with macros)

**Why Blocked**:
- Executables can contain malware
- Archives may contain hidden threats
- Macros can execute malicious code
- Security best practice

### File Size Limits

**Maximum File Size**:
- **Default Limit**: 25MB per file
- Configurable by administrator
- Large files may take longer to upload
- Consider file compression for large files

**Size Considerations**:
- Check file size before uploading
- Compress large images if needed
- Split very large documents if possible
- Consider file size for download speed

### Format Best Practices

**Choose Appropriate Formats**:
- Use PDF for documents that need to be read-only
- Use images for photos and screenshots
- Use Excel for data and calculations
- Use Word for editable documents

**File Naming**:
- Use descriptive file names
- Include dates if relevant
- Use consistent naming conventions
- Avoid special characters

**Quality vs Size**:
- Balance quality and file size
- Compress images when appropriate
- Use appropriate resolution
- Consider download speed

## Cloud Storage Usage

### Understanding Cloud Storage

The system uses Cloudinary, a cloud-based media management platform, for secure and reliable document storage. This ensures files are accessible from anywhere, backed up automatically, and protected against data loss.

### Cloudinary Integration

**What is Cloudinary**:
- Cloud-based media management service
- Secure file storage and delivery
- Automatic optimization and transformation
- Reliable and scalable infrastructure

**Benefits**:
- **Accessibility**: Files accessible from anywhere
- **Reliability**: High uptime and availability
- **Security**: Encrypted storage and transmission
- **Backup**: Automatic backups and redundancy
- **Performance**: Fast upload and download speeds

### How Cloudinary Works

**Upload Process**:
1. File selected from your computer
2. File uploaded to Cloudinary servers
3. File stored securely in cloud
4. Unique URL generated for access
5. File linked to project in database

**Storage Organization**:
- Files stored in organized folders
- Each file has unique identifier
- Files organized by project
- Easy to locate and manage

**Access Control**:
- Files accessed through secure URLs
- Authentication required for access
- Role-based permissions enforced
- Secure transmission (HTTPS)

### Cloudinary Features

**Automatic Optimization**:
- Images optimized for web delivery
- Reduced file sizes when appropriate
- Faster loading times
- Better user experience

**Secure URLs**:
- Files accessed via secure HTTPS URLs
- Authentication required
- Time-limited access if configured
- Protection against unauthorized access

**Reliability**:
- High availability (99.9% uptime)
- Automatic backups
- Redundant storage
- Data protection

**Scalability**:
- Handles large files efficiently
- Supports high upload volumes
- Scales automatically
- No storage limits (within plan)

### Local Storage Fallback

**Development Mode**:
- System can use local storage if Cloudinary not configured
- Files stored on server filesystem
- Used for development and testing
- Not recommended for production

**When Used**:
- Cloudinary credentials not configured
- Development environment
- Testing purposes
- Temporary fallback

**Limitations**:
- Not accessible from multiple locations
- No automatic backups
- Limited scalability
- Not recommended for production

### Storage Best Practices

**Cloudinary Configuration**:
- Ensure Cloudinary is properly configured
- Use production Cloudinary account
- Keep credentials secure
- Monitor storage usage

**File Organization**:
- Use appropriate categories
- Add descriptive names
- Include relevant descriptions
- Maintain organized structure

**Storage Management**:
- Delete unnecessary files
- Archive old documents
- Monitor storage usage
- Keep files current

## Downloading and Access Control

### Understanding Access Control

The system implements role-based access control to ensure documents are only accessible to authorized users, protecting sensitive information while enabling necessary collaboration.

### Who Can View/Download Documents

**Authorized Roles**:
- **Administrators**: Full access to all documents
- **Management**: Can view all documents
- **Sales users**: Can view documents (with project access)
- **Operations users**: Can view all documents
- **Finance users**: Can view all documents
- **Uploaders**: Can view their own uploaded documents

**Access Rules**:
- Users must have appropriate role
- Project access may be required
- Uploaders can always view their files
- Access is verified on each request

### Viewing Documents

**From Project Detail Page**:
1. Go to project's **Key Artifacts** section
2. Find document in list
3. Click **View** button (eye icon)
4. Document opens in new tab/window

**View Behavior**:
- **PDFs**: Open in browser PDF viewer
- **Images**: Display in browser
- **Videos**: Play in browser player
- **Other files**: May download instead

**View Permissions**:
- System checks user role
- Verifies project access
- Confirms uploader status
- Grants or denies access

### Downloading Documents

**From Project Detail Page**:
1. Go to project's **Key Artifacts** section
2. Find document in list
3. Click **Download** button (download icon)
4. File downloads to your computer

**Download Process**:
- File retrieved from cloud storage
- Authentication verified
- File streamed to browser
- Download starts automatically

**Download Permissions**:
- Same as view permissions
- Role-based access control
- Project access may be required
- Uploader can always download

### Access Control Details

**Role-Based Access**:
- **Admin**: Full access to all documents
- **Management**: Read-only access to all documents
- **Sales**: Access to documents in their projects
- **Operations**: Access to all documents
- **Finance**: Access to all documents
- **Uploader**: Always has access to own files

**Project-Based Access**:
- Documents linked to specific projects
- Access depends on project permissions
- Sales users see their project documents
- Other roles see all project documents

**Special Restrictions**:
- **AI Generated Proposal PDFs**: Only Admin can delete
- **Uploader Rights**: Can delete own files (except Proposal PDFs)
- **View Access**: All authorized roles can view
- **Download Access**: Same as view access

### Document Deletion

**Who Can Delete**:
- **Administrators**: Can delete any document
- **Uploaders**: Can delete their own documents
- **Exception**: AI Generated Proposal PDFs can only be deleted by Admin

**Deletion Process**:
1. Go to project's **Key Artifacts** section
2. Find document to delete
3. Click **Delete** button (trash icon)
4. Confirm deletion
5. Document removed from system

**Deletion Behavior**:
- File removed from cloud storage
- Database record deleted
- Audit log entry created
- Cannot be undone

**Deletion Restrictions**:
- AI Generated Proposal PDFs: Admin only
- Other documents: Admin or uploader
- System prevents unauthorized deletion
- Confirmation required

### Access Control Best Practices

**Security**:
- Don't share document URLs directly
- Use system access controls
- Report unauthorized access attempts
- Keep credentials secure

**Permissions**:
- Understand your role permissions
- Request access if needed
- Respect access restrictions
- Don't attempt unauthorized access

**Document Management**:
- Upload only necessary documents
- Delete outdated files
- Organize documents properly
- Maintain document security

## Document Categories

### Understanding Categories

Documents are organized into categories to help you find and manage files more efficiently. Categories provide structure and make it easier to locate specific types of documents.

### Available Categories

**Photos / Videos**:
- Installation photos
- Site survey images
- Progress videos
- Before/after pictures
- Equipment photos

**Documents**:
- PDFs and proposals
- Contracts and agreements
- Compliance documents
- Reports and analysis
- Word documents

**Sheets**:
- Excel spreadsheets
- Data files
- Calculations
- CSV files
- Financial data

### Category Selection

**Choosing Category**:
- Select based on file type
- Use category to organize
- Be consistent with selection
- Help others find files

**Category Benefits**:
- Easier file organization
- Quicker document location
- Better project management
- Improved collaboration

### Category Best Practices

**Consistency**:
- Use categories consistently
- Follow established patterns
- Help maintain organization
- Make files easy to find

**Appropriate Selection**:
- Choose correct category
- Match file type to category
- Use category appropriately
- Maintain organization

## Best Practices

### Document Management

**File Organization**:
- Use descriptive file names
- Select appropriate categories
- Add helpful descriptions
- Maintain organized structure

**Timely Upload**:
- Upload documents promptly
- Don't delay file uploads
- Keep documentation current
- Maintain complete records

**File Quality**:
- Ensure files are complete
- Verify content before upload
- Use appropriate formats
- Check file sizes

### Security Practices

**Access Control**:
- Understand your permissions
- Don't share direct URLs
- Report security concerns
- Keep credentials secure

**File Content**:
- Upload only necessary files
- Remove sensitive data if needed
- Follow company policies
- Maintain confidentiality

**Document Deletion**:
- Delete outdated files
- Remove unnecessary documents
- Clean up old files
- Maintain organized storage

### Collaboration

**Document Sharing**:
- Use system access controls
- Share through projects
- Maintain proper permissions
- Enable team collaboration

**Documentation**:
- Add clear descriptions
- Provide context
- Note important information
- Help others understand files

**Communication**:
- Notify team of new documents
- Document important files
- Share relevant information
- Maintain clear communication

### Performance

**File Size Management**:
- Keep files reasonably sized
- Compress large images
- Split very large documents
- Consider download speed

**Upload Efficiency**:
- Upload during off-peak hours if possible
- Check file size before upload
- Ensure stable internet connection
- Be patient with large files

**Storage Management**:
- Delete unnecessary files
- Archive old documents
- Monitor storage usage
- Keep storage organized

## Troubleshooting

### Upload Issues

**Upload Fails**:
- **Check file size**: Must be under 25MB (default)
- **Verify file type**: Must be supported format
- **Check internet connection**: Ensure stable connection
- **Try again**: Sometimes temporary issues occur
- **Contact administrator**: If problem persists

**File Type Not Supported**:
- **Check file extension**: Must be in allowed list
- **Verify file format**: May be corrupted
- **Convert file**: Use supported format
- **Contact administrator**: For special cases

**Upload Slow**:
- **Check file size**: Large files take longer
- **Check internet speed**: Slow connection affects upload
- **Be patient**: Large files need time
- **Try again**: Network issues may resolve

### Access Issues

**Cannot View Document**:
- **Check permissions**: Verify your role has access
- **Check project access**: Ensure project is accessible
- **Verify document exists**: May have been deleted
- **Refresh page**: Sometimes display issues
- **Contact administrator**: If access should be granted

**Cannot Download Document**:
- **Check permissions**: Same as view permissions
- **Check browser settings**: Popup blockers may interfere
- **Try different browser**: Browser compatibility issues
- **Check internet connection**: Download requires connection
- **Contact administrator**: If issue persists

**Document Not Found**:
- **Verify document exists**: May have been deleted
- **Check project access**: Document may be in different project
- **Refresh page**: Display may need update
- **Contact administrator**: If document should exist

### Storage Issues

**Cloudinary Not Working**:
- **Check configuration**: Cloudinary may not be configured
- **Check credentials**: May need to be updated
- **Contact administrator**: Configuration issue
- **System may use local storage**: Fallback mode

**File Not Accessible**:
- **Check file URL**: May be incorrect
- **Verify file exists**: May have been deleted
- **Check permissions**: Access may be restricted
- **Contact administrator**: Technical issue

## Getting Help

### Using Help Features

- Press **F1** from Projects page for context-sensitive help
- Click **Help** in navigation menu
- Review this guide for detailed information

### Contact Administrator

Contact administrator for:
- Cannot upload documents
- Need additional permissions
- Files not accessible
- Technical issues
- Questions about document management

## Summary

The Key Artifacts module provides:
- **Secure Storage**: Cloud-based storage with Cloudinary
- **Organized Management**: Category-based organization
- **Access Control**: Role-based permissions
- **Easy Access**: View and download capabilities
- **Complete Documentation**: All project files in one place

**Key Features**:
- Upload documents to projects
- Support for multiple file formats
- Cloud-based storage (Cloudinary)
- Secure access control
- View and download capabilities
- Category organization
- File deletion (with restrictions)

**Remember**:
- Upload documents promptly
- Use appropriate categories
- Add descriptive information
- Respect access controls
- Maintain organized storage
- Delete unnecessary files
- Keep documentation current
