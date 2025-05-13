const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

// Log the entire imported controller object and the specific function
console.log('[studentRoutes.js] Imported studentController:', studentController);
console.log('[studentRoutes.js] renderStudentAssignmentDetail from import:', studentController.renderStudentAssignmentDetail);

const { 
  getAllStudents, 
  getStudentById, 
  updateStudent, 
  deleteStudent, 
  getStudentCourses,
  getStudentCourseAssignments,
  submitAssignment,
  getStudentGrades,
  getStudentAttendance,
  enrollInCourse,
  renderStudentCourses,
  renderDashboard,
  renderBrowseCourses,
  renderStudentGradesPage,
  renderStudentAssignmentDetail
} = studentController;

const { protect, admin, teacher, student } = require('../middleware/authMiddleware');
const axios = require('axios');

// Dashboard and web routes
router.get('/dashboard', protect, student, renderDashboard);
router.get('/courses', protect, student, renderStudentCourses);
router.get('/browse-courses', protect, student, renderBrowseCourses);
router.get('/grades', protect, student, renderStudentGradesPage); // New route for student grades page

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

// Route to display student's assignments
router.get('/assignments', protect, student, async (req, res) => {
  try {
    // Get the student's ID
    const studentId = req.user.studentId;

    // Get all courses the student is enrolled in
    const response = await axios.get(`${req.protocol}://${req.get('host')}/api/enrollments/student?studentId=${studentId}`);
    const courses = response.data;

    // Get all assignments for the student
    const assignmentsResponse = await axios.get(
      `${req.protocol}://${req.get('host')}/api/assignments/student?studentId=${studentId}`
    );
    const assignments = assignmentsResponse.data;

    // Check if student has submissions for these assignments
    // In a real app, you'd fetch submissions data from your API
    // For now, we'll just assume no submissions have been made
    const assignmentsWithSubmissionStatus = assignments.map(assignment => {
      return {
        ...assignment,
        submitted: false // This would be determined by checking submissions
      };
    });

    res.render('student/assignments', { 
      title: 'My Assignments',
      user: req.user,
      courses,
      assignments: assignmentsWithSubmissionStatus,
      selectedCourseId: null
    });
  } catch (error) {
    console.error('Error fetching student assignments:', error);
    res.render('student/assignments', { 
      title: 'My Assignments',
      user: req.user,
      errorMessage: 'Failed to load assignments. Please try again later.',
      courses: [],
      assignments: []
    });
  }
});

// Route to view a specific assignment
router.get('/assignments/:id/view', protect, student, renderStudentAssignmentDetail);

// Course enrollment route
router.post('/enroll', protect, student, enrollInCourse);

module.exports = router;