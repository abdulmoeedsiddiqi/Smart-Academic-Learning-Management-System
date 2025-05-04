const express = require('express');
const router = express.Router();
const { protect, teacher, admin } = require('../middleware/authMiddleware');
const {
  getAttendanceRecords,
  getAttendanceByCourse,
  getAttendanceByStudent,
  createAttendance,
  updateAttendance,
  deleteAttendance
} = require('../controllers/attendanceController');

// Get all attendance records (admin only)
router.get('/', protect, admin, getAttendanceRecords);

// Get attendance by course 
router.get('/course/:courseId', protect, teacher, getAttendanceByCourse);

// Get attendance by student
router.get('/student/:studentId', protect, getAttendanceByStudent);

// Create attendance record (teacher only)
router.post('/', protect, teacher, createAttendance);

// Update attendance record (teacher only)
router.put('/:id', protect, teacher, updateAttendance);

// Delete attendance record (teacher or admin only)
router.delete('/:id', protect, teacher, deleteAttendance);

module.exports = router;
