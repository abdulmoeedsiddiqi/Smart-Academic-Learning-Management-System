const express = require('express');
const router = express.Router();
const { protect, teacher } = require('../middleware/authMiddleware');
const { Course, Student, Attendance, Enrollment, Teacher, User } = require('../models');
const { Op } = require('sequelize');

// @desc    Show attendance recording form with student list for a specific course and date
// @route   GET /teacher/attendance/record
// @access  Private/Teacher
router.get('/record', protect, teacher, async (req, res) => {
  try {
    const { courseId, date } = req.query;
    
    if (!courseId || !date) {
      return res.redirect('/teacher/attendance');
    }

    // Get teacher ID from logged in user
    let teacherId = req.user.teacherId;
    
    // If teacherId is not set in middleware, get it
    if (!teacherId) {
      const teacherProfile = await Teacher.findOne({
        where: { userId: req.user.id }
      });
      
      if (!teacherProfile) {
        req.flash('error_msg', 'Teacher profile not found');
        return res.redirect('/teacher/dashboard');
      }
      
      teacherId = teacherProfile.id;
    }
    
    // Find course and verify it belongs to this teacher
    const course = await Course.findOne({
      where: { 
        id: courseId,
        teacherId: teacherId 
      }
    });
    
    if (!course) {
      req.flash('error_msg', 'Course not found or you do not have permission to access it');
      return res.redirect('/teacher/attendance');
    }    // Get students enrolled in this course
    const enrollments = await Enrollment.findAll({
      where: { courseId },
      include: [
        {
          model: Student,
          include: [
            {
              model: User, 
              attributes: ['firstName', 'lastName', 'email']
            }
          ]
        }
      ]
    });
    
    console.log("Enrollments found:", enrollments.length);
    
    // Debug the first enrollment to see structure
    if (enrollments.length > 0) {
      console.log("First enrollment structure:", 
        JSON.stringify({
          id: enrollments[0].id,
          studentId: enrollments[0].studentId,
          hasStudent: !!enrollments[0].Student,
          studentInfo: enrollments[0].Student ? {
            id: enrollments[0].Student.id,
            hasUser: !!enrollments[0].Student.User,
            userInfo: enrollments[0].Student.User ? {
              firstName: enrollments[0].Student.User.firstName,
              lastName: enrollments[0].Student.User.lastName
            } : 'User not loaded'
          } : 'Student not loaded'
        }, null, 2)
      );
    }
    
    // Check if there are existing attendance records for this date
    const existingAttendance = await Attendance.findAll({
      where: {
        courseId,
        date: new Date(date)
      }
    });
      // Map existing attendance status to students
    const students = enrollments.map(enrollment => {
      // Make sure Student and User are available
      if (!enrollment.Student) {
        console.log(`Missing Student for enrollment ${enrollment.id}`);
        return null;
      }
      
      const student = enrollment.Student;
      const user = student.User;
      
      if (!user) {
        console.log(`Missing User for student ${student.id}`);
        return null;
      }
      
      // Find attendance record for this student if it exists
      const attendanceRecord = existingAttendance.find(a => a.studentId === student.id);
      
      return {
        id: student.id,
        name: `${user.firstName} ${user.lastName}`,
        studentId: student.studentId || 'N/A',  // Provide a fallback if missing
        status: attendanceRecord ? attendanceRecord.status : 'present', // Default to present
        notes: attendanceRecord ? attendanceRecord.notes : ''
      };
    }).filter(student => student !== null); // Remove any null entries
      res.render('teacher/attendance-record', {
      title: 'Record Attendance',
      user: req.user,
      course,
      date,
      students,
      existingRecords: existingAttendance.length > 0,
      layout: 'layouts/teacher' // Use teacher layout
    });
    
  } catch (error) {
    console.error('Error loading attendance record page:', error);
    req.flash('error_msg', 'An error occurred while loading the attendance record page');
    res.redirect('/teacher/attendance');
  }
});

// @desc    Save attendance records for a course on a specific date
// @route   POST /teacher/attendance/record
// @access  Private/Teacher
router.post('/record', protect, teacher, async (req, res) => {
  try {
    const { courseId, date, students } = req.body;
    
    // Validate input
    if (!courseId || !date || !students) {
      req.flash('error_msg', 'Missing required information');
      return res.redirect('/teacher/attendance');
    }
      // Get teacher ID from logged in user
    let teacherId = req.user.teacherId;
    
    // If teacherId is not set in middleware, get it
    if (!teacherId) {
      const teacherProfile = await Teacher.findOne({
        where: { userId: req.user.id }
      });
      
      if (!teacherProfile) {
        req.flash('error_msg', 'Teacher profile not found');
        return res.redirect('/teacher/dashboard');
      }
      
      teacherId = teacherProfile.id;
    }
    
    // Verify the course exists and belongs to this teacher
    const course = await Course.findOne({
      where: { 
        id: courseId,
        teacherId: teacherId 
      }
    });
    
    if (!course) {
      req.flash('error_msg', 'Course not found or you do not have permission to access it');
      return res.redirect('/teacher/attendance');
    }    // Process each student's attendance
    // Check if students data is properly structured in the form submission
    console.log("Students data received:", students);
    
    // Handle different formats of student data
    let studentArray = [];
    
    if (Array.isArray(students)) {
      // Already an array
      studentArray = students;
    } else if (students && typeof students === 'object') {
      // Convert object format to array (for indexed object format)
      studentArray = Object.keys(students).map(key => students[key]);
    }
    
    console.log("Processed student array:", studentArray);
    
    // If still empty, try to reconstruct from request body
    if (studentArray.length === 0) {
      // Find all keys that match the pattern 'students[N][studentId]'
      const studentKeys = Object.keys(req.body).filter(key => key.match(/^students\[\d+\]\[studentId\]$/));
      
      // Extract the indices from keys
      const indices = studentKeys.map(key => {
        const match = key.match(/^students\[(\d+)\]/);
        return match ? parseInt(match[1]) : -1;
      }).filter(index => index !== -1);
      
      // Reconstruct student data
      for (const index of indices) {
        studentArray.push({
          studentId: req.body[`students[${index}][studentId]`],
          status: req.body[`students[${index}][status]`],
          notes: req.body[`students[${index}][notes]`] || ''
        });
      }
    }
    
    // Process each student's attendance
    for (const studentData of studentArray) {
      // Extract values from student data
      const studentId = studentData.studentId;
      const status = studentData.status;
      const notes = studentData.notes || '';
      
      // Find or create attendance record
      const [attendance, created] = await Attendance.findOrCreate({
        where: { 
          studentId,
          courseId,
          date: new Date(date)
        },
        defaults: {
          status,
          notes,
          recordedBy: req.user.id
        }
      });
      
      // If record already exists, update it
      if (!created) {
        attendance.status = status;
        attendance.notes = notes;
        attendance.recordedBy = req.user.id;
        await attendance.save();
      }
    }
    
    req.flash('success_msg', 'Attendance recorded successfully');
    res.redirect('/teacher/attendance');
    
  } catch (error) {
    console.error('Error recording attendance:', error);
    req.flash('error_msg', 'An error occurred while recording attendance');
    res.redirect('/teacher/attendance');
  }
});

// @desc    List of all attendance records for a particular date
// @route   GET /teacher/attendance/list
// @access  Private/Teacher
router.get('/list', protect, teacher, async (req, res) => {
  try {
    // Get teacher ID
    let teacherId = req.user.teacherId;
    
    // If teacherId is not set in middleware, get it
    if (!teacherId) {
      const teacherProfile = await Teacher.findOne({
        where: { userId: req.user.id }
      });
      
      if (!teacherProfile) {
        req.flash('error_msg', 'Teacher profile not found');
        return res.redirect('/teacher/dashboard');
      }
      
      teacherId = teacherProfile.id;
    }
    
    // Get all courses for this teacher
    const courses = await Course.findAll({
      where: { teacherId },
      order: [['name', 'ASC']]
    });
    
    // Get the most recent attendance records
    const recentAttendance = await Attendance.findAll({
      limit: 20,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Course,
          where: { teacherId },
          required: true
        },
        {
          model: Student,
          include: [{
            model: User,
            attributes: ['firstName', 'lastName']
          }]
        }
      ]
    });
      res.render('teacher/attendance-list', {
      title: 'Attendance Records',
      user: req.user,
      courses,
      recentAttendance,
      layout: 'layouts/teacher' // Use teacher layout
    });
  } catch (error) {
    console.error('Error loading attendance list:', error);
    req.flash('error_msg', 'An error occurred while loading attendance records');
    res.redirect('/teacher/dashboard');
  }
});

// @desc    View attendance history for a course
// @route   GET /teacher/attendance/history
// @access  Private/Teacher
router.get('/history', protect, teacher, async (req, res) => {
  try {
    const { courseId } = req.query;
    
    if (!courseId) {
      return res.redirect('/teacher/attendance');
    }
      // Get teacher ID from logged in user
    let teacherId = req.user.teacherId;
    
    // If teacherId is not set in middleware, get it
    if (!teacherId) {
      const teacherProfile = await Teacher.findOne({
        where: { userId: req.user.id }
      });
      
      if (!teacherProfile) {
        req.flash('error_msg', 'Teacher profile not found');
        return res.redirect('/teacher/dashboard');
      }
      
      teacherId = teacherProfile.id;
    }
    
    // Find course and verify it belongs to this teacher
    const course = await Course.findOne({
      where: { 
        id: courseId,
        teacherId: teacherId 
      }
    });
    
    if (!course) {
      req.flash('error_msg', 'Course not found or you do not have permission to access it');
      return res.redirect('/teacher/attendance');
    }
    
    // Get attendance records for this course, grouped by date
    const attendanceRecords = await Attendance.findAll({
      where: { courseId },
      order: [['date', 'DESC']],
      include: [
        {
          model: Student,
          include: ['User']
        }
      ]
    });
    
    // Group attendance records by date
    const attendanceByDate = {};
    attendanceRecords.forEach(record => {
      const dateStr = record.date.toISOString().split('T')[0];
      if (!attendanceByDate[dateStr]) {
        attendanceByDate[dateStr] = [];
      }
      attendanceByDate[dateStr].push({
        id: record.id,
        student: `${record.Student.User.firstName} ${record.Student.User.lastName}`,
        studentId: record.Student.studentId,
        status: record.status,
        notes: record.notes
      });
    });
      res.render('teacher/attendance-history', {
      title: 'Attendance History',
      user: req.user,
      course,
      attendanceByDate,
      layout: 'layouts/teacher' // Use teacher layout
    });
    
  } catch (error) {
    console.error('Error loading attendance history:', error);
    req.flash('error_msg', 'An error occurred while loading attendance history');
    res.redirect('/teacher/attendance');
  }
});

// @desc    Save attendance records via API for a course on a specific date
// @route   POST /teachers/:teacherIdParam/courses/:courseIdParam/record
// @access  Private/Teacher
router.post('/teachers/:teacherIdParam/courses/:courseIdParam/record', protect, teacher, async (req, res) => { // Changed path
  try {
    const { teacherIdParam, courseIdParam } = req.params;
    const { date, students } = req.body;

    if (!date || !students || !Array.isArray(students)) {
      return res.status(400).json({ message: 'Missing or invalid date or students data. Ensure students is an array.' });
    }

    let actualLoggedInTeacherId = req.user.teacherId; 
    if (!actualLoggedInTeacherId && req.user && req.user.id) {
      const teacherProfile = await Teacher.findOne({ where: { userId: req.user.id } });
      if (!teacherProfile) {
        return res.status(403).json({ message: 'Teacher profile not found for logged-in user.' });
      }
      actualLoggedInTeacherId = teacherProfile.id.toString();
      req.user.teacherId = actualLoggedInTeacherId; // Optionally cache it on req.user for this request
    } else if (!actualLoggedInTeacherId) {
        return res.status(401).json({ message: 'User not authenticated or teacher ID not available.' });
    }
    
    if (actualLoggedInTeacherId !== teacherIdParam) {
      return res.status(403).json({ message: 'Access Denied: Teacher ID mismatch.' });
    }

    const course = await Course.findOne({
      where: { 
        id: courseIdParam,
        teacherId: actualLoggedInTeacherId 
      }
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found or not assigned to this teacher.' });
    }

    if (students.length === 0) {
        return res.status(200).json({ message: 'No student attendance data submitted. No changes made.' });
    }

    const attendanceProcessingResults = [];
    for (const studentData of students) {
      const { studentId, status, notes } = studentData;
      
      if (!studentId || !status) {
        console.warn(`Skipping invalid attendance data for course ${courseIdParam}: studentId or status missing.`);
        attendanceProcessingResults.push({ studentId: studentId || 'unknown', status: 'error', message: 'Missing studentId or status.' });
        continue; 
      }

      const enrollment = await Enrollment.findOne({ where: { courseId: courseIdParam, studentId: studentId } });
      if (!enrollment) {
          console.warn(`Student ${studentId} not enrolled in course ${courseIdParam}. Skipping attendance.`);
          attendanceProcessingResults.push({ studentId, status: 'skipped', message: 'Student not enrolled in this course.' });
          continue;
      }

      try {
        const [attendance, created] = await Attendance.findOrCreate({
          where: { 
            studentId: studentId,
            courseId: courseIdParam,
            date: new Date(date)
          },
          defaults: {
            status,
            notes: notes || '',
            recordedBy: req.user.id 
          }
        });

        if (!created) {
          attendance.status = status;
          attendance.notes = notes || '';
          attendance.recordedBy = req.user.id;
          await attendance.save();
          attendanceProcessingResults.push({ studentId, status: 'updated' });
        } else {
          attendanceProcessingResults.push({ studentId, status: 'created' });
        }
      } catch (dbError) {
        console.error(`Error saving attendance for student ${studentId} in course ${courseIdParam}:`, dbError);
        attendanceProcessingResults.push({ studentId, status: 'error', message: 'Database error during save.' });
      }
    }

    const hasErrors = attendanceProcessingResults.some(r => r.status === 'error');
    if (hasErrors) {
        return res.status(207).json({ 
            message: 'Attendance recording completed with some errors.',
            results: attendanceProcessingResults 
        });
    }

    res.status(200).json({ message: 'Attendance recorded successfully.', results: attendanceProcessingResults });

  } catch (error) {
    console.error('API Error recording attendance:', error);
    res.status(500).json({ message: 'An internal server error occurred while recording attendance.' });
  }
});

const attendanceController = require('../controllers/attendanceController');

// Route to record attendance (POST)
// POST /teachers/attendance/record
router.post(
    '/teachers/attendance/record', // Changed path
    protect, 
    teacher, 
    attendanceController.recordAttendance
);

// Route to get attendance records for a specific course and teacher (e.g., for a specific day or form population)
// GET /teachers/:teacherId/courses/:courseId/attendance
router.get(
    '/teachers/:teacherId/courses/:courseId/attendance', // Changed path
    protect,
    teacher,
    attendanceController.getAttendanceForCourse
);

// New route to get historical attendance data
// GET /teachers/:teacherId/courses/:courseId/attendance/history
router.get(
    '/teachers/:teacherId/courses/:courseId/attendance/history', // Changed path
    protect,
    teacher,
    attendanceController.getAttendanceHistory 
);

module.exports = router;
