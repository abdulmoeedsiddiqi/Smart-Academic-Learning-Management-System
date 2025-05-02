const express = require('express');
const router = express.Router();
const { 
  getAllTeachers, 
  getTeacherById, 
  createTeacher,
  updateTeacher, 
  deleteTeacher,
  getTeacherCourses,
  createCourse,
  createAssignment,
  gradeSubmission,
  recordAttendance
} = require('../controllers/teacherController');
const { protect, admin, teacher } = require('../middleware/authMiddleware');

// Admin routes
router.get('/', protect, admin, getAllTeachers);
router.post('/', protect, admin, createTeacher);
router.delete('/:id', protect, admin, deleteTeacher);

// Teacher routes (protected - accessible by the teacher themselves or admin)
router.get('/:id', protect, getTeacherById);
router.put('/:id', protect, updateTeacher);
router.get('/:id/courses', protect, getTeacherCourses);
router.post('/:id/courses', protect, teacher, createCourse);
router.post('/:id/courses/:courseId/assignments', protect, teacher, createAssignment);
router.post('/:id/submissions/:submissionId/grade', protect, teacher, gradeSubmission);
router.post('/:id/courses/:courseId/attendance', protect, teacher, recordAttendance);

module.exports = router;
