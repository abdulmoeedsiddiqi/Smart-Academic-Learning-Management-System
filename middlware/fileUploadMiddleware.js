const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up storage for assignment files
const assignmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/uploads/assignments');
    
    // Create directory if it doesn't exist
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    } catch (err) {
      console.error('Error creating upload directory:', err);
      cb(new Error('Could not create upload directory: ' + err.message));
    }
  },
  filename: (req, file, cb) => {
    try {
      // Generate unique filename: timestamp-original-filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      const fileName = 'assignment-' + uniqueSuffix + extension;
      cb(null, fileName);
    } catch (err) {
      console.error('Error generating filename:', err);
      cb(new Error('Could not generate filename: ' + err.message));
    }
  }
});

// File filter to only accept PDFs
const pdfFilter = (req, file, cb) => {
  try {
    console.log('Checking file type:', file.mimetype);
    // Accept both standard PDF mime type and octet-stream (some browsers)
    if (file.mimetype === 'application/pdf' || 
        (file.originalname.toLowerCase().endsWith('.pdf') && file.mimetype === 'application/octet-stream')) {
      cb(null, true);
    } else {
      cb(new Error(`Only PDF files are allowed for assignments! Received: ${file.mimetype}`), false);
    }
  } catch (err) {
    console.error('Error in PDF filter:', err);
    cb(new Error('Error processing file: ' + err.message));
  }
};

// Create custom error handler for multer
const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).render('error', { 
        message: 'File too large. Maximum size is 10MB.',
        error: { status: 400 }
      });
    }
    return res.status(400).render('error', { 
      message: 'File upload error: ' + err.message,
      error: { status: 400 }
    });
  } else if (err) {
    // An unknown error occurred
    return res.status(500).render('error', { 
      message: 'Unexpected error during upload: ' + err.message,
      error: { status: 500 }
    });
  }
  next();
};

// Create the multer upload instance
const uploadAssignmentPDF = multer({
  storage: assignmentStorage,
  fileFilter: pdfFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
  }
});

module.exports = {
  uploadAssignmentPDF,
  multerErrorHandler
};