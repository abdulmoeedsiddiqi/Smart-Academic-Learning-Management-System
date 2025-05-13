const express = require('express');
const router = express.Router();

const { 
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  enrollStudent,
  getCourseStudents,
  getCourseAssignments,
  getTeacherCoursesByUserId,
} = require('../controllers/courseController');
const { protect, admin, teacher } = require('../middleware/authMiddleware');

router.use((req, res, next) => {
  next();
});

// Public routes
router.get('/', getAllCourses);

router.get('/:id', getCourseById);

// Protected routes
router.put('/:id', protect, updateCourse);
router.delete('/:id', protect, admin, deleteCourse);
router.post('/:id/enroll', protect, admin, enrollStudent);
router.get('/:id/students', protect, getCourseStudents);
router.get('/:id/assignments', protect, getCourseAssignments);
router.get('/teacher/:userId', protect, getTeacherCoursesByUserId);

module.exports = router;