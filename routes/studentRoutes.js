const express = require('express');
const router = express.Router();
const { 
  getAllStudents, 
  getStudentById, 
  updateStudent, 
  deleteStudent, 
  getStudentCourses,
  getStudentCourseAssignments,
  submitAssignment,
  getStudentGrades,
  getStudentAttendance
} = require('../controllers/studentController');
const { protect, admin, teacher, student } = require('../middleware/authMiddleware');

// Admin routes
router.get('/', protect, admin, getAllStudents);
router.get('/:id', protect, admin, getStudentById);
router.put('/:id', protect, admin, updateStudent);
router.delete('/:id', protect, admin, deleteStudent);

// Student routes (protected - accessible by the student or admin)
router.get('/:id/courses', protect, getStudentCourses);
router.get('/:id/courses/:courseId/assignments', protect, getStudentCourseAssignments);
router.post('/:id/assignments/:assignmentId/submit', protect, student, submitAssignment);
router.get('/:id/grades', protect, getStudentGrades);
router.get('/:id/attendance', protect, getStudentAttendance);

module.exports = router;
