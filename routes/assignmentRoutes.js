const express = require('express');
const router = express.Router();

const { protect, teacher } = require('../middleware/authMiddleware');
const { 
  getAssignments, 
  getAssignmentById, 
  createAssignment,
  updateAssignment, 
  deleteAssignment, 
  getSubmissions 
} = require('../controllers/assignmentController');
const { uploadAssignmentPDF } = require('../middleware/fileUploadMiddleware');

// Route: GET /api/assignments - Get all assignments
router.get('/', protect, getAssignments);

// Route: POST /api/assignments - Create a new assignment (teacher only, with file upload)
router.post(
  '/', 
  protect, 
  teacher, 
  uploadAssignmentPDF.single('file'), 
  createAssignment
);

// Route: GET /api/assignments/:id - Get assignment by ID
router.get('/:id', protect, getAssignmentById);

// Route: PUT /api/assignments/:id - Update an assignment (teacher only)
router.put('/:id', protect, teacher, updateAssignment);

// Route: DELETE /api/assignments/:id - Delete an assignment (teacher only)
router.delete('/:id', protect, teacher, deleteAssignment);

// Route: GET /api/assignments/:id/submissions - Get submissions for assignment (teacher only)
router.get('/:id/submissions', protect, teacher, getSubmissions);

module.exports = router;
