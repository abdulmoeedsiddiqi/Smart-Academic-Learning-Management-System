const express = require('express');
const router = express.Router();

const { protect, teacher } = require('../middleware/authMiddleware');
const { 
  getAssignments, 
  getAssignmentById, 
  createAssignment,
  updateAssignment, 
  deleteAssignment, 
  getSubmissions,
  getStudentAssignments 
} = require('../controllers/assignmentController');
const { uploadAssignmentPDF } = require('../middleware/fileUploadMiddleware');

// TEMPORARY TEST ROUTE
// Access this via /student/test-assignment-route in your browser
// Check your server console for the log message.
router.get('/test-assignment-route', (req, res) => {
  console.log('SUCCESS: /student/test-assignment-route in assignmentRoutes.js was reached!');
  res.send('Test route in assignmentRoutes.js is working. If you see this, assignmentRoutes.js is likely mounted correctly at /student. Now check the /assignments route and its controller.');
});

// Route: GET /student/assignments - Get assignments for enrolled courses (student view page)
router.get('/assignments', protect, getStudentAssignments);

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
