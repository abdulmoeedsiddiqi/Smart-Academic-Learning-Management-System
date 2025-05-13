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
  recordAttendance,
  getTeacherAssignments,
  viewAllStudents,
  viewCourseDetails
} = require('../controllers/teacherController');
const { protect, admin, teacher } = require('../middleware/authMiddleware');
const { uploadAssignmentPDF } = require('../middleware/fileUploadMiddleware');
const { Teacher, Course } = require('../models');

// Admin routes
router.get('/', protect, admin, getAllTeachers);
router.post('/', protect, admin, createTeacher);

// Teacher routes (protected - accessible by the teacher themselves or admin)
// Important: All static routes before dynamic parameter routes
router.get('/dashboard', protect, teacher, (req, res) => {
  res.render('teacher/dashboard', { 
    title: 'Teacher Dashboard', 
    user: req.user, 
    layout: 'layouts/teacher',
    currentPath: req.path
  });
});

router.get('/assignments', protect, teacher, getTeacherAssignments);

router.get('/grades', protect, teacher, async (req, res) => {
  try {
    const teacherProfile = await Teacher.findOne({
      where: { userId: req.user.id }
    });

    if (!teacherProfile) {
      req.flash('error', 'Teacher profile not found.');
      return res.redirect('/teacher/dashboard');
    }

    const courses = await Course.findAll({
      where: { teacherId: teacherProfile.id }
    });

    res.render('teacher/grades', {
      title: 'Grade Management',
      user: req.user,
      courses: courses || [],
      layout: 'layouts/teacher',
      currentPath: req.path
    });
  } catch (error) {
    console.error('Error loading grades page:', error);
    req.flash('error', 'Failed to load grade management page.');
    res.redirect('/teacher/dashboard');
  }
});

router.get('/submissions', protect, teacher, (req, res) => {
  res.render('teacher/submissions', { 
    title: 'Submissions', 
    user: req.user, 
    layout: 'layouts/teacher',
    currentPath: req.path
  });
});

router.get('/attendance', protect, teacher, async (req, res) => {
  try {
    const teacherProfile = await Teacher.findOne({
      where: { userId: req.user.id }
    });
    
    if (!teacherProfile) {
      req.flash('error', 'Teacher profile not found.');
      return res.redirect('/teacher/dashboard');
    }
    req.user.teacherId = teacherProfile.id;

    const courses = await Course.findAll({
        where: { teacherId: teacherProfile.id }
    });

    res.render('teacher/attendance-form', {
      title: 'Record Attendance',
      user: req.user,
      teacherId: teacherProfile.id,
      courses: courses || [],
      layout: 'layouts/teacher',
      currentPath: req.path
    });
  } catch (error) {
    console.error('Error loading attendance page:', error);
    req.flash('error', 'Failed to load attendance page.');
    res.redirect('/teacher/dashboard');
  }
});

router.get('/attendance/view', protect, teacher, async (req, res) => {
  try {
    const teacherProfile = await Teacher.findOne({
      where: { userId: req.user.id }
    });

    if (!teacherProfile) {
      req.flash('error', 'Teacher profile not found.');
      return res.redirect('/teacher/dashboard');
    }

    const courses = await Course.findAll({
      where: { teacherId: teacherProfile.id }
    });

    res.render('teacher/attendance-view', {
      title: 'View Attendance Records',
      user: req.user,
      teacherId: teacherProfile.id,
      courses: courses || [],
      currentPath: req.path,
      layout: 'layouts/teacher'
    });
  } catch (error) {
    console.error('Error loading view attendance page:', error);
    req.flash('error', 'Failed to load page for viewing attendance.');
    res.redirect('/teacher/dashboard');
  }
});

router.get('/all-students', protect, teacher, viewAllStudents);

// Route for a specific course detail view for a teacher
router.get('/courses/:courseId', protect, teacher, viewCourseDetails);

// Dynamic routes with params AFTER all static routes
router.delete('/:id', protect, admin, deleteTeacher);
router.get('/:id', protect, admin, getTeacherById);
router.put('/:id', protect, updateTeacher);
router.get('/:id/courses', protect, getTeacherCourses);
router.post('/:id/courses', protect, teacher, createCourse);

router.post('/:id/courses/:courseId/assignments', protect, teacher, uploadAssignmentPDF.single('file'), createAssignment);
router.post('/:id/submissions/:submissionId/grade', protect, teacher, gradeSubmission);
router.post('/:id/courses/:courseId/attendance', protect, teacher, recordAttendance);

module.exports = router;