const { Student, User, Course, Enrollment, Assignment, Submission, Grade, Attendance, Teacher } = require('../models');
const { Op, Sequelize } = require('sequelize');
const { sequelize } = require('../config/db');

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
          as: 'courseTeacher', // Changed from 'instructor'
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
      limit: 10,
      // Include all new fields for assignment files
      attributes: [
        'id', 'title', 'description', 'dueDate', 'courseId', 'totalPoints', 
        'assignmentNumber', 'type', 'filePath', 'fileName', 'fileOriginalName'
      ]
    });
    
    // Get student's recent grades
    const recentGrades = await Grade.findAll({
      where: { studentId: student.id },
      include: [
        { 
          model: Course
        },
        { 
          model: Assignment,
          as: 'GradedAssignment' // Added alias for Assignment model
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

// @desc    Render available courses page
// @route   GET /student/browse-courses
// @access  Private/Student
const renderBrowseCourses = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'student') {
      return res.redirect('/login');
    }
    
    // Get student data
    const student = await Student.findOne({
      where: { userId: req.user.id }
    });
    
    if (!student) {
      return res.status(404).render('error', { 
        message: 'Student profile not found',
        error: { status: 404 }
      });
    }

    // Get filter parameters
    const { search, department, credits } = req.query;
    
    // Build filter conditions
    let whereConditions = {
      isActive: true // Only show active courses
    };
    
    if (search) {
      whereConditions[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { courseCode: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (department) {
      whereConditions.department = department;
    }
    
    if (credits) {
      whereConditions.credits = credits;
    }
    
    // Get all available courses
    const courses = await Course.findAll({
      where: whereConditions,
      include: [{
        model: Teacher,
        as: 'courseTeacher', // Changed from 'instructor'
        include: [{
          model: User,
          attributes: ['firstName', 'lastName']
        }]
      }],
      order: [['name', 'ASC']]
    });
    
    // Get the student's enrolled course IDs
    const enrollments = await Enrollment.findAll({
      where: { 
        studentId: student.id,
        status: { [Op.ne]: 'dropped' } // Exclude dropped enrollments
      }
    });
    
    const enrolledCourseIds = enrollments.map(enrollment => enrollment.courseId);
    
    // Get unique departments for filter dropdown - simplified approach
    let departments = [];
    try {
      // Use raw query to get distinct departments to avoid sequelize.fn issues
      const [results] = await sequelize.query(
        'SELECT DISTINCT department FROM "Courses" WHERE department IS NOT NULL'
      );
      departments = results.map(result => result.department).filter(Boolean);
    } catch (error) {
      console.error('Error fetching departments:', error);
      // Fallback - extract departments from fetched courses
      departments = [...new Set(courses
        .map(course => course.department)
        .filter(Boolean))];
    }
    
    // Count enrolled students for each course
    for (const course of courses) {
      const enrolledCount = await Enrollment.count({
        where: { 
          courseId: course.id,
          status: { [Op.ne]: 'dropped' }
        }
      });
      course.enrolledCount = enrolledCount;
    }
    
    res.render('student/browse-courses', {
      title: 'Browse Available Courses - SALAMS',
      user: req.user,
      student,
      courses,
      enrolledCourses: enrolledCourseIds,
      departments,
      filters: { search, department, credits }
    });
    
  } catch (error) {
    console.error('Browse Courses Error:', error);
    res.status(500).render('error', { 
      message: 'Error fetching available courses',
      error: { status: 500, stack: error.stack }
    });
  }
};

// @desc    Render student courses page
// @route   GET /student/courses
// @access  Private/Student
const renderStudentCourses = async (req, res) => {
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
          as: 'courseTeacher', // Changed from 'instructor'
          include: [{
            model: User,
            attributes: ['firstName', 'lastName']
          }]
        }]
      }]
    });
    
    // Count assignments for each course
    for (const enrollment of enrollments) {
      const assignmentCount = await Assignment.count({
        where: { courseId: enrollment.courseId }
      });
      enrollment.Course.assignmentCount = assignmentCount;
    }
    
    res.render('student/courses', {
      title: 'My Courses - SALAMS',
      user: req.user,
      student,
      enrollments
    });
    
  } catch (error) {
    console.error('My Courses Error:', error);
    res.status(500).render('error', { 
      message: 'Error fetching courses data',
      error: { status: 500, stack: error.stack }
    });
  }
};

// @desc    Render student's overall grades page
// @route   GET /student/grades
// @access  Private/Student
const renderStudentGradesPage = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      console.error('User not authenticated or user ID missing for grades page.');
      return res.status(401).render('error', { 
        title: 'Authentication Error',
        message: 'Authentication required to view grades.', 
        user: req.user,
        error: { status: 401 } 
      });
    }

    const studentProfile = await Student.findOne({ 
      where: { userId: req.user.id },
      attributes: ['id'] // Fetch only the necessary student ID
    });

    if (!studentProfile) {
      console.error(`No student profile found for user ID: ${req.user.id} when fetching grades.`);
      return res.status(404).render('error', { 
        title: 'Profile Not Found',
        message: 'Student profile not found. Cannot fetch grades.', 
        user: req.user,
        error: { status: 404 } 
      });
    }

    const studentIdForQuery = studentProfile.id; // Use the PK of the Student model
    console.log(`Fetching grades for student's primary ID (Student.id): ${studentIdForQuery}`);

    const grades = await Grade.findAll({
      where: { studentId: studentIdForQuery }, // Use the correctly fetched student ID
      include: [
        {
          model: Assignment,
          as: 'GradedAssignment', // Ensure this alias matches the one in model definition
          attributes: ['title', 'totalPoints', 'courseId'], 
        },
        {
          model: Course,
          attributes: ['name', 'courseCode'], // Changed 'title' to 'name'
        }
      ],
      order: [
        [Course, 'name', 'ASC'], // Changed 'title' to 'name' for ordering
        [{ model: Assignment, as: 'GradedAssignment' }, 'title', 'ASC']
      ],
      logging: console.log // For debugging SQL query
    });

    console.log(`Grades fetched: ${JSON.stringify(grades, null, 2)}`);

    // Group grades by course
    const gradesByCourse = grades.reduce((acc, grade) => {
      const courseTitle = grade.Course ? grade.Course.name : 'Unknown Course'; // Changed grade.Course.title to grade.Course.name
      if (!acc[courseTitle]) {
        acc[courseTitle] = {
          course: grade.Course,
          grades: []
        };
      }
      acc[courseTitle].grades.push(grade);
      return acc;
    }, {});

    console.log(`Grades grouped by course: ${JSON.stringify(gradesByCourse, null, 2)}`);

    res.render('student/grades', {
      title: 'My Grades',
      gradesByCourse, // Pass the grouped grades to the view
      user: req.user,
      message: null // Ensure message is always passed, even if null
    });
  } catch (error) {
    console.error('Error fetching student grades:', error);
    // Ensure the error view also gets a title and user, if available
    res.status(500).render('error', { 
      title: 'Error',
      message: 'Error fetching student grades. Please try again later.', 
      error: { status: 500, stack: error.stack }, 
      user: req.user 
    });
  }
};

// @desc    Render student assignment detail page
// @route   GET /student/assignments/:id/view
// @access  Private/Student
const renderStudentAssignmentDetail = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).render('error', {
        title: 'Authentication Error',
        message: 'Authentication required to view assignment details.',
        user: req.user,
        error: { status: 401 }
      });
    }

    const studentProfile = await Student.findOne({
      where: { userId: req.user.id },
      attributes: ['id']
    });

    console.log('[renderStudentAssignmentDetail] req.user:', JSON.stringify(req.user, null, 2));
    console.log('[renderStudentAssignmentDetail] studentProfile:', JSON.stringify(studentProfile, null, 2));

    if (!studentProfile) {
      console.error(`[renderStudentAssignmentDetail] Student profile not found for userId: ${req.user.id}`);
      return res.status(404).render('error', {
        title: 'Profile Not Found',
        message: 'Student profile not found. Cannot fetch assignment details.',
        user: req.user,
        error: { status: 404 }
      });
    }
    const studentId = studentProfile.id;
    const assignmentId = req.params.id;

    const assignment = await Assignment.findByPk(assignmentId, {
      include: [
        {
          model: Course,
          attributes: ['id', 'name', 'courseCode']
        }
      ]
    });

    if (!assignment) {
      return res.status(404).render('error', {
        title: 'Assignment Not Found',
        message: 'The requested assignment could not be found.',
        user: req.user,
        error: { status: 404 }
      });
    }

    // Check if the student is enrolled in the course of this assignment
    const enrollment = await Enrollment.findOne({
      where: {
        studentId: studentId,
        courseId: assignment.courseId
      }
    });

    if (!enrollment) {
        return res.status(403).render('error', {
            title: 'Access Denied',
            message: 'You are not enrolled in the course for this assignment.',
            user: req.user,
            error: { status: 403 }
        });
    }

    const submission = await Submission.findOne({
      where: {
        studentId: studentId,
        assignmentId: assignmentId
      }
    });

    res.render('student/assignment-detail', {
      title: assignment.title || 'Assignment Detail',
      assignment,
      submission,
      user: req.user,
      student: studentProfile, // Pass studentProfile as student
      course: assignment.Course // Pass course data to the view
    });

  } catch (error) {
    console.error('Error rendering student assignment detail:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      message: 'Could not load assignment details.',
      user: req.user,
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
              as: 'courseTeacher', // Changed from 'instructor'
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

// @desc    Enroll a student in a course
// @route   POST /api/students/enroll
// @access  Private/Student
const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    
    // Get student data
    const student = await Student.findOne({
      where: { userId: req.user.id }
    });
    
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }
    
    // Check if course exists and is active
    const course = await Course.findOne({
      where: { 
        id: courseId,
        isActive: true
      }
    });
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found or is not active' });
    }
    
    // Check if student is already enrolled
    const existingEnrollment = await Enrollment.findOne({
      where: { 
        studentId: student.id, 
        courseId,
        status: { [Op.ne]: 'dropped' } // Not considering dropped enrollments
      }
    });
    
    if (existingEnrollment) {
      return res.status(400).json({ message: 'You are already enrolled in this course' });
    }
    
    // Check if course has reached capacity
    if (course.capacity !== null) {
      const enrolledCount = await Enrollment.count({
        where: { 
          courseId,
          status: { [Op.ne]: 'dropped' } // Not considering dropped enrollments
        }
      });
      
      if (enrolledCount >= course.capacity) {
        return res.status(400).json({ message: 'This course has reached its capacity' });
      }

      // Update enrolled count
      course.enrolledCount = enrolledCount + 1;
      await course.save();
    }
    
    // Check prerequisites
    if (course.prerequisites && course.prerequisites.length > 0) {
      // Get student's completed courses
      const completedEnrollments = await Enrollment.findAll({
        where: { 
          studentId: student.id,
          status: 'completed'
        },
        include: [{
          model: Course,
          attributes: ['courseCode']
        }]
      });
      
      const completedCourseCodes = completedEnrollments.map(
        enrollment => enrollment.Course.courseCode
      );
      
      // Check if all prerequisites are completed
      const missingPrereqs = course.prerequisites.filter(
        prereq => !completedCourseCodes.includes(prereq)
      );
      
      if (missingPrereqs.length > 0) {
        return res.status(400).json({ 
          message: `You need to complete the following prerequisites first: ${missingPrereqs.join(', ')}`
        });
      }
    }
    
    // Create enrollment
    const enrollment = await Enrollment.create({
      studentId: student.id,
      courseId,
      status: 'active',
      enrollmentDate: new Date()
    });

    res.status(201).json({
      message: 'Successfully enrolled in the course',
      enrollment
    });
  } catch (error) {
    console.error('Enrollment Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = {
  renderDashboard,
  renderBrowseCourses,
  renderStudentCourses,
  renderStudentGradesPage,
  renderStudentAssignmentDetail, // Add new function to exports
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentCourses,
  getStudentCourseAssignments,
  submitAssignment,
  getStudentGrades,
  getStudentAttendance,
  enrollInCourse
};
