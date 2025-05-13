const { User, Student, Teacher, Course, Assignment, Submission, Attendance, Grade, Enrollment } = require('../models');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize'); // Import Op for date comparisons

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    // Get counts from various models
    const userCount = await User.count();
    const studentCount = await Student.count();
    const teacherCount = await Teacher.count();
    const courseCount = await Course.count();
    const assignmentCount = await Assignment.count();
    const submissionCount = await Submission.count();

    // Get active vs inactive users
    const activeUsers = await User.count({ where: { isActive: true } });
    const inactiveUsers = userCount - activeUsers;
    
    // Get course distribution by teacher
    const courses = await Course.findAll({
      attributes: ['teacherId'],
      include: [
        {
          model: Teacher,
          as: 'courseTeacher', // Changed from 'instructor'
          required: false,
          attributes: ['id'],
          include: [
            {
              model: User,
              attributes: ['firstName', 'lastName'],
              required: false
            }
          ]
        }
      ]
    });
    
    const coursesByTeacher = {};
    courses.forEach(course => {
      if (course.courseTeacher && course.courseTeacher.User) {
        const teacherName = `${course.courseTeacher.User.firstName} ${course.courseTeacher.User.lastName}`;
        if (!coursesByTeacher[teacherName]) {
          coursesByTeacher[teacherName] = 0;
        }
        coursesByTeacher[teacherName] += 1;
      } else {
        // Count courses without assigned teachers
        if (!coursesByTeacher['Unassigned']) {
          coursesByTeacher['Unassigned'] = 0;
        }
        coursesByTeacher['Unassigned'] += 1;
      }
    });
    
    // Get some recent activities
    const recentSubmissions = await Submission.findAll({
      limit: 5,
      order: [['submissionDate', 'DESC']],
      include: [
        {
          model: Student,
          required: false,
          include: [{ 
            model: User, 
            attributes: ['firstName', 'lastName'],
            required: false 
          }]
        },
        {
          model: Assignment,
          attributes: ['title'],
          required: false,
          include: [{ 
            model: Course, 
            attributes: ['name'],
            required: false 
          }]
        }
      ]
    });
    
    const recentAttendance = await Attendance.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Course,
          attributes: ['name'],
          required: false
        }
      ]
    });

    // Recent grades
    const recentGrades = await Grade.findAll({
      limit: 5,
      order: [['gradedDate', 'DESC']],
      include: [
        {
          model: Student,
          required: false,
          include: [{ 
            model: User, 
            attributes: ['firstName', 'lastName'],
            required: false 
          }]
        },
        {
          model: Course,
          attributes: ['name'],
          required: false
        }
      ]
    });

    res.json({
      counts: {
        users: userCount,
        students: studentCount,
        teachers: teacherCount,
        courses: courseCount,
        assignments: assignmentCount,
        submissions: submissionCount
      },
      userStatus: {
        active: activeUsers,
        inactive: inactiveUsers
      },
      coursesByTeacher,
      recentActivity: {
        submissions: recentSubmissions.map(sub => {
          // Safely handle missing relationships
          const studentName = sub.Student && sub.Student.User ? 
            `${sub.Student.User.firstName} ${sub.Student.User.lastName}` : 
            'Unknown Student';
          
          const assignmentTitle = sub.Assignment ? sub.Assignment.title : 'Unknown Assignment';
          const courseName = sub.Assignment && sub.Assignment.Course ? 
            sub.Assignment.Course.name : 
            'Unknown Course';
          
          return {
            id: sub.id,
            student: studentName,
            assignment: assignmentTitle,
            course: courseName,
            date: sub.submissionDate
          };
        }),
        attendance: recentAttendance.map(att => ({
          id: att.id,
          course: att.Course ? att.Course.name : 'Unknown Course',
          date: att.date,
          status: att.status
        })),
        grades: recentGrades.map(grade => {
          // Safely handle missing relationships
          const studentName = grade.Student && grade.Student.User ? 
            `${grade.Student.User.firstName} ${grade.Student.User.lastName}` : 
            'Unknown Student';
          
          const courseName = grade.Course ? grade.Course.name : 'Unknown Course';
          
          return {
            id: grade.id,
            student: studentName,
            course: courseName,
            value: grade.value,
            date: grade.gradedDate
          };
        })
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get list of all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsersList = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a new user
// @route   POST /api/admin/users
// @access  Private/Admin
const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create user with plain text password - no hashing
    const user = await User.create({
      firstName,
      lastName,
      email,
      password, // Store password directly without hashing
      role,
      isActive: true
    });

    // If role is student, create student profile
    if (role === 'student') {
      await Student.create({
        userId: user.id,
        studentId: `STU${Date.now().toString().slice(-6)}`,
        enrollmentDate: new Date()
      });
    }

    // If role is teacher, create teacher profile
    if (role === 'teacher') {
      await Teacher.create({
        userId: user.id,
        teacherId: `TCH${Date.now().toString().slice(-6)}`,
        hireDate: new Date()
      });
    }

    res.status(201).json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update a user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { firstName, lastName, email, role, isActive, password } = req.body;

    // Find user
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user fields
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    user.role = role || user.role;
    
    if (isActive !== undefined) {
      user.isActive = isActive;
    }

    // Update password directly if provided, no hashing
    if (password) {
      user.password = password;
    }

    await user.save();

    res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Find user
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user's role-specific profile (if exists)
    if (user.role === 'student') {
      const student = await Student.findOne({ where: { userId } });
      if (student) await student.destroy();
    } else if (user.role === 'teacher') {
      const teacher = await Teacher.findOne({ where: { userId } });
      if (teacher) await teacher.destroy();
    }

    // Delete user
    await user.destroy();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get system logs (placeholder - would connect to actual logging system)
// @route   GET /api/admin/logs
// @access  Private/Admin
const getSystemLogs = async (req, res) => {
  try {
    // In a real application, this would connect to a logging system
    // For now, return a placeholder response
    
    const mockLogs = [
      {
        id: 1,
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: 'User login successful',
        user: 'john.doe@example.com',
        ip: '192.168.1.1'
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 1000 * 60).toISOString(),
        level: 'WARNING',
        message: 'Failed login attempt',
        user: 'unknown',
        ip: '192.168.1.2'
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        level: 'ERROR',
        message: 'Database connection error',
        user: 'system',
        ip: 'localhost'
      }
    ];
    
    res.json({
      message: 'System logs (example data - would be real logs in production)',
      logs: mockLogs
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Render admin dashboard view
// @route   GET /admin/dashboard
// @access  Private/Admin
const renderDashboard = async (req, res) => {
  try {
    // Get counts from various models
    const userCount = await User.count();
    const studentCount = await Student.count();
    const teacherCount = await Teacher.count();
    const courseCount = await Course.count();
    
    // Get recent users
    const recentUsers = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    // Get recent courses with optional instructor relationship
    const recentCourses = await Course.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      include: [
        {
          model: Teacher,
          as: 'courseTeacher', // Changed from 'instructor'
          required: false, // Make the relationship optional
          include: [{ 
            model: User, 
            attributes: ['firstName', 'lastName'],
            required: false // Make user relationship optional too
          }]
        }
      ]
    });
    
    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      user: req.user,
      stats: {
        userCount,
        studentCount,
        teacherCount,
        courseCount
      },
      recentUsers,
      recentCourses
    });
  } catch (error) {
    console.error('Admin Dashboard Error:', error);
    res.status(500).render('error', { 
      message: 'Error loading admin dashboard',
      error: { status: 500 }
    });
  }
};

// Render admin student management page
const renderStudentManagement = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).render('error', { message: 'Access denied. Admin privileges required.' });
    }
    
    const students = await Student.findAll({
      include: [{ 
        model: User,
        attributes: ['id', 'firstName', 'lastName', 'email', 'createdAt'] 
      }],
      order: [[{ model: User, as: 'User' }, 'lastName', 'ASC']]
    });
    
    res.render('admin/students', {
      title: 'Student Management - SALAMS',
      user: req.user,
      students
    });
  } catch (error) {
    console.error('Admin Student Management Error:', error);
    res.status(500).render('error', { message: 'Error loading student management page' });
  }
};

// Render student edit form
const renderStudentEdit = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).render('error', { 
        message: 'Access denied. Admin privileges required.',
        statusCode: 403
      });
    }
    
    const { studentId } = req.params;
    
    // Find the student with their user data
    const student = await Student.findByPk(studentId, {
      include: [{ model: User }]
    });
    
    if (!student) {
      return res.status(404).render('error', { 
        message: 'Student not found', 
        statusCode: 404
      });
    }
    
    res.render('admin/student-edit', {
      title: `Edit Student: ${student.User.firstName} ${student.User.lastName}`,
      user: req.user,
      student,
      studentUser: student.User
    });
  } catch (error) {
    console.error('Student Edit Error:', error);
    res.status(500).render('error', { 
      message: 'Error loading student edit form',
      error: { status: 500 },
      statusCode: 500
    });
  }
};

// Update student details
const updateStudentDetails = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
    }
    
    const { studentId } = req.params;
    
    // Find the student with their user data
    const student = await Student.findByPk(studentId, {
      include: [{ model: User }]
    });
    
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    // Get form data
    const { firstName, lastName, email, password, studentIdNumber, grade, section, parentName, parentEmail, parentPhone, address, status } = req.body;
    
    // Update user details
    if (firstName) student.User.firstName = firstName;
    if (lastName) student.User.lastName = lastName;
    if (email) student.User.email = email;
    if (password) student.User.password = password;
    
    // Update student details
    if (studentIdNumber) student.studentId = studentIdNumber;
    if (grade) student.grade = grade;
    if (section) student.section = section;
    if (parentName) student.parentName = parentName;
    if (parentEmail) student.parentEmail = parentEmail;
    if (parentPhone) student.parentPhone = parentPhone;
    if (address) student.address = address;
    if (status) student.status = status;
    
    // Save changes
    await student.User.save();
    await student.save();
    
    req.flash('success', 'Student information updated successfully');
    res.redirect('/admin/students');
  } catch (error) {
    console.error('Student Update Error:', error);
    req.flash('error', 'Failed to update student information');
    res.redirect(`/admin/students/${req.params.studentId}/edit`);
  }
};

// Remove student
const removeStudent = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
    }
    
    const { studentId } = req.params;
    
    // Find the student
    const student = await Student.findByPk(studentId, {
      include: [{ model: User }]
    });
    
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    // Get user ID for later deletion
    const userId = student.User.id;
    
    // Remove enrollments first (maintain referential integrity)
    await Enrollment.destroy({ where: { studentId } });
    
    // Remove student profile
    await Student.destroy({ where: { id: studentId } });
    
    // Remove user account
    await User.destroy({ where: { id: userId } });
    
    // Based on request type, return JSON or redirect
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json({ success: true, message: 'Student removed successfully' });
    }
    
    // Redirect to student management page for web requests
    req.flash('success', 'Student removed successfully');
    return res.redirect('/admin/students');
    
  } catch (error) {
    console.error('Remove Student Error:', error);
    
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({ success: false, message: 'Failed to remove student' });
    }
    
    res.status(500).render('error', { message: 'Error removing student' });
  }
};

// Render admin teacher management page
const renderTeacherManagement = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).render('error', { message: 'Access denied. Admin privileges required.' });
    }
    
    const teachers = await Teacher.findAll({
      include: [{ 
        model: User,
        attributes: ['id', 'firstName', 'lastName', 'email', 'createdAt'] 
      }],
      order: [[{ model: User, as: 'User' }, 'lastName', 'ASC']]
    });
    
    res.render('admin/teachers', {
      title: 'Teacher Management - SALAMS',
      user: req.user,
      teachers
    });
  } catch (error) {
    console.error('Admin Teacher Management Error:', error);
    res.status(500).render('error', { message: 'Error loading teacher management page' });
  }
};

// Remove teacher
const removeTeacher = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
    }
    
    const { teacherId } = req.params;
    
    // Find the teacher
    const teacher = await Teacher.findByPk(teacherId, {
      include: [{ model: User }]
    });
    
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }
    
    // Get user ID for later deletion
    const userId = teacher.User.id;
    
    // Find courses taught by this teacher
    const courses = await Course.findAll({ where: { teacherId } });
    
    // If teacher has courses, reassign or delete them
    if (courses && courses.length > 0) {
      // For demonstration, we'll delete the courses, but in production you might want to
      // reassign them to other teachers or mark them as inactive
      for (const course of courses) {
        // First delete all enrollments for this course
        await Enrollment.destroy({ where: { courseId: course.id } });
        
        // Then delete the course
        await course.destroy();
      }
    }
    
    // Remove teacher profile
    await Teacher.destroy({ where: { id: teacherId } });
    
    // Remove user account
    await User.destroy({ where: { id: userId } });
    
    // Based on request type, return JSON or redirect
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json({ success: true, message: 'Teacher removed successfully' });
    }
    
    // Redirect to teacher management page for web requests
    req.flash('success', 'Teacher removed successfully');
    return res.redirect('/admin/teachers');
    
  } catch (error) {
    console.error('Remove Teacher Error:', error);
    
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({ success: false, message: 'Failed to remove teacher' });
    }
    
    res.status(500).render('error', { message: 'Error removing teacher' });
  }
};

// Render admin course management page
const renderCourseManagement = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).render('error', { message: 'Access denied. Admin privileges required.' });
    }
    
    const courses = await Course.findAll({
      include: [{ 
        model: Teacher,
        as: 'courseTeacher', // Changed from 'instructor'
        include: [{ model: User, attributes: ['firstName', 'lastName'] }]
      }],
      order: [['name', 'ASC']]
    });
    
    res.render('admin/courses', {
      title: 'Course Management - SALAMS',
      user: req.user,
      courses
    });
  } catch (error) {
    console.error('Admin Course Management Error:', error);
    res.status(500).render('error', { message: 'Error loading course management page' });
  }
};

// @desc    Create a new course
// @route   POST /api/admin/courses
// @access  Private/Admin
const createCourse = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
    }

    const { name, description, teacherId } = req.body;

    // Basic validation
    if (!name || !description) {
      return res.status(400).json({ success: false, message: 'Course name and description are required.' });
    }

    // Check if teacher exists (if provided)
    if (teacherId) {
      const teacher = await Teacher.findByPk(teacherId);
      if (!teacher) {
        return res.status(404).json({ success: false, message: 'Selected teacher not found.' });
      }
    }

    // Create the course
    const course = await Course.create({
      name,
      description,
      teacherId: teacherId || null // Assign null if no teacher is selected
    });

    // Respond based on request type
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(201).json({ success: true, message: 'Course created successfully', course });
    }

    // Redirect to course management page for web requests
    req.flash('success', 'Course created successfully');
    return res.redirect('/admin/courses');

  } catch (error) {
    console.error('Create Course Error:', error);
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({ success: false, message: 'Failed to create course' });
    }
    req.flash('error', 'Failed to create course');
    // Redirect back to the form or a relevant page
    res.redirect(req.headers.referer || '/admin/courses/new');
  }
};

// Remove course
const removeCourse = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
    }
    
    const { courseId } = req.params;
    
    // Find the course
    const course = await Course.findByPk(courseId);
    
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    // First delete all enrollments for this course
    await Enrollment.destroy({ where: { courseId } });
    
    // Then delete the course
    await course.destroy();
    
    // Based on request type, return JSON or redirect
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json({ success: true, message: 'Course removed successfully' });
    }
    
    // Redirect to course management page for web requests
    req.flash('success', 'Course removed successfully');
    return res.redirect('/admin/courses');
    
  } catch (error) {
    console.error('Remove Course Error:', error);
    
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({ success: false, message: 'Failed to remove course' });
    }
    
    res.status(500).render('error', { message: 'Error removing course' });
  }
};

// Unenroll student from course
const unenrollStudent = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
    }
    
    const { enrollmentId } = req.params;
    
    // Find the enrollment
    const enrollment = await Enrollment.findByPk(enrollmentId);
    
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }
    
    // Delete the enrollment
    await enrollment.destroy();
    
    // Based on request type, return JSON or redirect
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json({ success: true, message: 'Student unenrolled successfully' });
    }
    
    // Redirect back to the previous page or to a default page
    req.flash('success', 'Student unenrolled successfully');
    return res.redirect(req.headers.referer || '/admin/courses');
    
  } catch (error) {
    console.error('Unenroll Student Error:', error);
    
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({ success: false, message: 'Failed to unenroll student' });
    }
    
    res.status(500).render('error', { message: 'Error unenrolling student' });
  }
};

// Render course enrollment management
const renderCourseEnrollments = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).render('error', { message: 'Access denied. Admin privileges required.' });
    }
    
    const { courseId } = req.params;
    
    // Find the course
    const course = await Course.findByPk(courseId, {
      include: [{ 
        model: Teacher,
        as: 'courseTeacher', // Changed from 'instructor'
        include: [{ model: User, attributes: ['firstName', 'lastName'] }]
      }]
    });
    
    if (!course) {
      return res.status(404).render('error', { message: 'Course not found' });
    }
    
    // Get all enrollments for this course
    const enrollments = await Enrollment.findAll({
      where: { courseId },
      include: [{
        model: Student,
        include: [{ model: User, attributes: ['firstName', 'lastName', 'email'] }]
      }],
      order: [[{ model: Student, as: 'student' }, { model: User, as: 'User' }, 'lastName', 'ASC']]
    });
    
    res.render('admin/course-enrollments', {
      title: `${course.name} - Enrollments`,
      user: req.user,
      course,
      enrollments
    });
  } catch (error) {
    console.error('Course Enrollments Error:', error);
    res.status(500).render('error', { message: 'Error loading course enrollments' });
  }
};

// @desc    Get reports data
// @route   GET /api/admin/reports
// @access  Private/Admin
const getReports = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      // Differentiate response based on request type
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      } else {
        return res.status(403).render('error', { message: 'Access denied. Admin privileges required.' });
      }
    }

    // Define time range (e.g., last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Count users added in the last 30 days
    const newUsersCount = await User.count({
      where: {
        createdAt: {
          [Op.gte]: thirtyDaysAgo
        }
      }
    });

    // Count courses added in the last 30 days
    const newCoursesCount = await Course.count({
      where: {
        createdAt: {
          [Op.gte]: thirtyDaysAgo
        }
      }
    });

    // Note: Tracking removed users/courses directly is harder without soft deletes or an audit log.
    // We'll return the counts of currently existing entities for simplicity.
    const totalUsers = await User.count();
    const totalCourses = await Course.count();
    const totalStudents = await Student.count();
    const totalTeachers = await Teacher.count();

    const reportData = {
      period: 'Last 30 Days',
      newUsers: newUsersCount,
      newCourses: newCoursesCount,
      totals: {
        users: totalUsers,
        students: totalStudents,
        teachers: totalTeachers,
        courses: totalCourses,
      }
      // Add more report data as needed (e.g., enrollments, submissions)
    };

    // Respond based on request type
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json(reportData);
    } else {
      // Render the reports view
      res.render('admin/reports', {
        title: 'Admin Reports - SALAMS',
        user: req.user,
        reports: reportData
      });
    }

  } catch (error) {
    console.error('Get Reports Error:', error);
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({ message: 'Server Error generating reports' });
    } else {
      res.status(500).render('error', { message: 'Error generating reports' });
    }
  }
};

// @desc    Admin login with fixed credentials
// @route   POST /api/admin/login
// @access  Public
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Fixed admin credentials
    const ADMIN_EMAIL = 'admin@salams.edu';
    const ADMIN_PASSWORD = 'admin123'; // Should use a better password in production
    
    // Verify fixed credentials
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(401).json({ message: 'Invalid admin credentials' });
      } else {
        return res.render('admin/login', { 
          title: 'Admin Login',
          layout: false, 
          error: 'Invalid email or password' 
        });
      }
    }
    
    // Check if admin user exists in database
    let adminUser = await User.findOne({ where: { email: ADMIN_EMAIL } });
    
    // If admin doesn't exist in the database yet, create it
    if (!adminUser) {
      adminUser = await User.create({
        firstName: 'System',
        lastName: 'Administrator',
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD, // Would normally be hashed
        role: 'admin',
        isActive: true
      });
    }
    
    // Generate token for the admin
    const token = jwt.sign(
      { id: adminUser.id, role: 'admin' },
      process.env.JWT_SECRET || 'salams_lms_secret_key_for_secure_jwt_tokens',
      { expiresIn: '1d' }
    );
    
    // Set cookie with JWT token
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    
    // Respond based on request type
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json({
        id: adminUser.id,
        name: `${adminUser.firstName} ${adminUser.lastName}`,
        email: adminUser.email,
        role: adminUser.role,
        token
      });
    } else {
      return res.redirect('/admin/dashboard');
    }
  } catch (error) {
    console.error('Admin Login Error:', error);
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      return res.render('admin/login', { 
        title: 'Admin Login',
        layout: false,
        error: 'Server error. Please try again.' 
      });
    }
  }
};

// @desc    Render admin login page
// @route   GET /admin/login
// @access  Public
const renderAdminLogin = (req, res) => {
  res.render('admin/login', { 
    title: 'Admin Login',
    layout: false  // Set layout to false to prevent using any layout
  });
};

// Fix module exports to use consistent export pattern
module.exports = {
  getDashboardStats,
  getUsersList,
  createUser,
  updateUser,
  deleteUser,
  getSystemLogs,
  renderDashboard,
  renderStudentManagement,
  renderStudentEdit,
  updateStudentDetails,
  removeStudent,
  renderTeacherManagement,
  removeTeacher,
  renderCourseManagement,
  createCourse, // Add new function
  removeCourse,
  unenrollStudent,
  renderCourseEnrollments,
  getReports, // Add new function
  adminLogin,
  renderAdminLogin
};
