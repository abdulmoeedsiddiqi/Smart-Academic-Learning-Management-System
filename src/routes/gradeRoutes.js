const express = require('express');
const router = express.Router();
const { protect, teacher, admin } = require('../middleware/authMiddleware');
const {
  getGrades,
  getStudentGrades,
  getCourseGrades,
  createGrade,
  updateGrade,
  deleteGrade
} = require('../controllers/gradeController');

// Get all grades (admin only)
router.get('/', getGrades);

// Get grades by student
router.get('/student/:studentId', protect, getStudentGrades);

// Get grades by course
router.get('/course/:courseId', protect, teacher, getCourseGrades);

// Create a grade (teacher only)
router.post('/', protect, teacher, createGrade);

// Update a grade (teacher only)
router.put('/:id', protect, teacher, updateGrade);

// Delete a grade (teacher or admin only)
router.delete('/:id', protect, teacher, deleteGrade);

module.exports = router;