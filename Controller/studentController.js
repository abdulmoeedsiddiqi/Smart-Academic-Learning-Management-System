const { Student, User, Course, Enrollment, Assignment, Submission, Grade, Attendance, Teacher } = require('../models');
const { Op } = require('sequelize');

// @desc    Render student dashboard page
// @route   GET /student/dashboard
// @access  Private/Student
const renderDashboard = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'student') {
      return res.redirect('/login');
    }
    
    // Get student data
    const student = await Student.findOne({
      where: { userId: req.user.id },
      include: [{ model: User }]
    });
    
    if (!student) {
      return res.status(404).render('error', { 
        message: 'Student profile not found',
        error: { status: 404 }
      });
    }
    
    // Get student's course enrollments with course details
    const enrollments = await Enrollment.findAll({
      where: { 
        studentId: student.id,
        status: { [Op.ne]: 'dropped' } // Get active and completed enrollments
      },
      include: [{
        model: Course,
        include: [{
          model: Teacher,
          as: 'instructor',
          include: [{
            model: User,
            attributes: ['firstName', 'lastName']
          }]
        }]
      }]
    });
    
    // Get pending assignments that are due soon
    const currentDate = new Date();
    // Calculate date two weeks from now
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(currentDate.getDate() + 14);
    
    // Extract courseIds from enrollments for the query
    const enrolledCourseIds = enrollments.map(enrollment => enrollment.courseId);
    
    const pendingAssignments = await Assignment.findAll({
      where: {
        dueDate: {
          [Op.gte]: currentDate
        },
        courseId: {
          [Op.in]: enrolledCourseIds
        }
      },
      include: [{
        model: Course
      }],
      order: [['dueDate', 'ASC']],
      limit: 10
    });
    
    // Get student's recent grades
    const recentGrades = await Grade.findAll({
      where: { studentId: student.id },
      include: [
        { 
          model: Course
        },
        { 
          model: Assignment
        }
      ],
      order: [['updatedAt', 'DESC']],
      limit: 5
    });
    
    // Calculate attendance percentage for each course
    const attendanceStats = [];
    
    for (const enrollment of enrollments) {
      const attendanceRecords = await Attendance.findAll({
        where: { 
          studentId: student.id,
          courseId: enrollment.courseId
        }
      });
      
      const totalClasses = attendanceRecords.length;
      const presentClasses = attendanceRecords.filter(record => 
        record.status === 'present').length;
      
      const attendancePercentage = totalClasses > 0 
        ? Math.round((presentClasses / totalClasses) * 100) 
        : 'N/A';
        
      attendanceStats.push({
        courseId: enrollment.courseId,
        courseName: enrollment.Course.name,
        totalClasses,
        presentClasses,
        percentage: attendancePercentage
      });
    }
    
    // Create welcome message for the dashboard
    const welcomeMessage = `Welcome back, ${student.User.firstName}!`;
    
    // Pass all data to the dashboard view
    res.render('student/dashboard', {
      title: 'Student Dashboard - SALAMS',
      user: req.user,
      student,
      enrollments,
      pendingAssignments,
      recentGrades,
      attendanceStats,
      welcomeMessage // Add the welcome message to be displayed
    });
    
  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).render('error', { 
      message: 'Error fetching dashboard data',
      error: { status: 500, stack: error.stack }
    });
  }
};

// @desc    Get all students
// @route   GET /api/students
// @access  Private/Admin
const getAllStudents = async (req, res) => {
  try {
    const students = await Student.findAll({
      include: [
        {
          model: User,
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive'],
        },
      ],
    });

    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get student by ID
// @route   GET /api/students/:id
// @access  Private/Admin
const getStudentById = async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive'],
        },
      ],
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private/Admin
const updateStudent = async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Update basic student fields
    const { grade, section, parentName, parentEmail, parentPhone, address, dateOfBirth } = req.body;
    
    student.grade = grade || student.grade;
    student.section = section || student.section;
    student.parentName = parentName || student.parentName;
    student.parentEmail = parentEmail || student.parentEmail;
    student.parentPhone = parentPhone || student.parentPhone;
    student.address = address || student.address;
    student.dateOfBirth = dateOfBirth || student.dateOfBirth;
    
    await student.save();

    res.json({ message: 'Student updated successfully', student });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private/Admin
const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get the associated user
    const user = await User.findByPk(student.userId);

    if (!user) {
      return res.status(404).json({ message: 'Associated user not found' });
    }

    // Delete the student and user
    await student.destroy();
    await user.destroy();

    res.json({ message: 'Student removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get student's courses
// @route   GET /api/students/:id/courses
// @access  Private
const getStudentCourses = async (req, res) => {
  try {
    const studentId = req.params.id || req.user.id;

    // Get enrollments for the student with course details
    const enrollments = await Enrollment.findAll({
      where: { studentId },
      include: [
        {
          model: Course,
          include: [
            {
              model: Teacher,
              as: 'instructor',
              include: [
                {
                  model: User,
                  attributes: ['firstName', 'lastName']
                }
              ]
            }
          ]
        }
      ]
    });

    res.json(enrollments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get student assignments for a course
// @route   GET /api/students/:id/courses/:courseId/assignments
// @access  Private
const getStudentCourseAssignments = async (req, res) => {
  try {
    const { id: studentId, courseId } = req.params;
    
    // Verify student is enrolled in the course
    const enrollment = await Enrollment.findOne({
      where: { studentId, courseId }
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'Student is not enrolled in this course' });
    }

    // Get all assignments for the course
    const assignments = await Assignment.findAll({
      where: { courseId },
      include: [
        {
          model: Submission,
          where: { studentId },
          required: false // Left join to show assignments even if no submissions
        }
      ]
    });

    res.json(assignments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Submit assignment
// @route   POST /api/students/:id/assignments/:assignmentId/submit
// @access  Private
const submitAssignment = async (req, res) => {
  try {
    const { id: studentId, assignmentId } = req.params;
    const { content } = req.body;
    
    // Check if assignment exists
    const assignment = await Assignment.findByPk(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if student is enrolled in the course
    const enrollment = await Enrollment.findOne({
      where: { studentId, courseId: assignment.courseId }
    });

    if (!enrollment) {
      return res.status(403).json({ message: 'Student is not enrolled in this course' });
    }

    // Check if submission already exists
    let submission = await Submission.findOne({
      where: { studentId, assignmentId }
    });

    if (submission) {
      // Update existing submission
      submission.content = content;
      submission.submissionDate = new Date();
      submission.isLate = new Date() > new Date(assignment.dueDate);
      
      await submission.save();
    } else {
      // Create new submission
      submission = await Submission.create({
        studentId,
        assignmentId,
        content,
        submissionDate: new Date(),
        isLate: new Date() > new Date(assignment.dueDate),
        status: 'submitted'
      });
    }

    res.status(201).json({
      message: 'Assignment submitted successfully',
      submission
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get student grades
// @route   GET /api/students/:id/grades
// @access  Private
const getStudentGrades = async (req, res) => {
  try {
    const studentId = req.params.id;
    
    // Get grades with course and assignment information
    const grades = await Grade.findAll({
      where: { studentId },
      include: [
        {
          model: Course,
          attributes: ['id', 'name', 'courseCode']
        },
        {
          model: Assignment,
          attributes: ['id', 'title', 'totalMarks']
        }
      ]
    });

    res.json(grades);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get student attendance
// @route   GET /api/students/:id/attendance
// @access  Private
const getStudentAttendance = async (req, res) => {
  try {
    const studentId = req.params.id;
    
    // Get attendance records with course information
    const attendance = await Attendance.findAll({
      where: { studentId },
      include: [
        {
          model: Course,
          attributes: ['id', 'name', 'courseCode']
        }
      ],
      order: [['date', 'DESC']]
    });

    res.json(attendance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  renderDashboard,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentCourses,
  getStudentCourseAssignments,
  submitAssignment,
  getStudentGrades,
  getStudentAttendance
};