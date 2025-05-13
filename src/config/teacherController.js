const { Teacher, User, Course, Student, Assignment, Submission, Grade, Attendance, Enrollment } = require('../models');
const { Op } = require('sequelize');

// @desc    Render teacher dashboard page
// @route   GET /teacher/dashboard
// @access  Private/Teacher
const renderDashboard = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return res.redirect('/login');
    }
    
    // Get teacher data
    const teacher = await Teacher.findOne({
      where: { userId: req.user.id },
      include: [{ model: User }]
    });
    
    if (!teacher) {
      return res.status(404).render('error', { 
        message: 'Teacher profile not found',
        error: { status: 404 }
      });
    }
    
    // Get courses taught by this teacher
    const courses = await Course.findAll({
      where: { teacherId: teacher.id }
    });
    
    // Get course IDs for further queries
    const courseIds = courses.map(course => course.id);
    
    // Get recent assignments
    const recentAssignments = await Assignment.findAll({
      where: { courseId: courseIds },
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    // Get recent submissions that need grading
    const pendingSubmissions = await Submission.findAll({
      include: [
        {
          model: Assignment,
          where: { courseId: courseIds }
        },
        {
          model: Student,
          include: [{ model: User, attributes: ['firstName', 'lastName'] }]
        }
      ],
      where: { status: 'submitted' },
      order: [['submissionDate', 'DESC']],
      limit: 10
    });
    
    // Create welcome message for the dashboard
    const welcomeMessage = `Welcome back, ${teacher.User.firstName}!`;
    
    // Pass all data to the dashboard view
    res.render('teacher/dashboard', {
      title: 'Teacher Dashboard - SALAMS',
      user: req.user,
      teacher,
      courses,
      recentAssignments,
      pendingSubmissions,
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

// @desc    Get all teachers
// @route   GET /api/teachers
// @access  Private/Admin
const getAllTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.findAll({
      include: [
        {
          model: User,
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive'],
        },
      ],
    });

    res.json(teachers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get teacher by ID
// @route   GET /api/teachers/:id
// @access  Private/Admin/Teacher
const getTeacherById = async (req, res) => {
  try {
    const teacherId = req.params.id;

    // Basic UUID validation
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(teacherId)) {
      return res.status(400).send('Invalid Teacher ID format'); // Sending a direct response for now
    }

    const teacher = await Teacher.findByPk(teacherId, {
      include: [
        {
          model: User,
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive'],
        },
      ],
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Check if the requester is the teacher themselves or an admin
    if (
      req.user.role !== 'admin' &&
      teacher.userId !== req.user.id
    ) {
      return res.status(403).json({ message: 'Not authorized to access this teacher profile' });
    }

    res.json(teacher);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a teacher
// @route   POST /api/teachers
// @access  Private/Admin
const createTeacher = async (req, res) => {
  try {
    const { userId, department, qualification, specialization, experience, bio } = req.body;
    
    // Check if user exists and is a teacher
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role !== 'teacher') {
      return res.status(400).json({ message: 'User is not a teacher' });
    }
    
    // Check if teacher profile already exists
    const existingTeacher = await Teacher.findOne({ where: { userId } });
    if (existingTeacher) {
      return res.status(400).json({ message: 'Teacher profile already exists for this user' });
    }

    // Generate teacher ID
    const teacherId = `TCH${Date.now().toString().slice(-6)}`;

    // Create teacher profile
    const teacher = await Teacher.create({
      userId,
      teacherId,
      department,
      hireDate: new Date(),
      qualification,
      specialization,
      experience,
      bio
    });

    res.status(201).json(teacher);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update teacher
// @route   PUT /api/teachers/:id
// @access  Private/Admin/Teacher
const updateTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByPk(req.params.id);

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Check if the requester is the teacher themselves or an admin
    if (
      req.user.role !== 'admin' &&
      teacher.userId !== req.user.id
    ) {
      return res.status(403).json({ message: 'Not authorized to update this teacher profile' });
    }

    // Update teacher fields
    const { department, qualification, specialization, experience, bio } = req.body;
    
    teacher.department = department || teacher.department;
    teacher.qualification = qualification || teacher.qualification;
    teacher.specialization = specialization || teacher.specialization;
    teacher.experience = experience || teacher.experience;
    teacher.bio = bio || teacher.bio;
    
    await teacher.save();

    res.json({ message: 'Teacher updated successfully', teacher });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete teacher
// @route   DELETE /api/teachers/:id
// @access  Private/Admin
const deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByPk(req.params.id);

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Get the associated user
    const user = await User.findByPk(teacher.userId);

    if (!user) {
      return res.status(404).json({ message: 'Associated user not found' });
    }

    // Delete the teacher and user
    await teacher.destroy();
    await user.destroy();

    res.json({ message: 'Teacher removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get teacher's courses
// @route   GET /api/teachers/:id/courses
// @access  Private/Teacher/Admin
const getTeacherCourses = async (req, res) => {
  try {
    const teacherId = req.params.id;
    
    // Verify that the teacher exists
    const teacher = await Teacher.findByPk(teacherId);
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Get courses taught by the teacher
    const courses = await Course.findAll({
      where: { teacherId }
    });

    res.json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a new course
// @route   POST /api/teachers/:id/courses
// @access  Private/Teacher/Admin
const createCourse = async (req, res) => {
  try {
    const teacherId = req.params.id;
    
    // Verify that the teacher exists
    const teacher = await Teacher.findByPk(teacherId);
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Check if the requester is the teacher themselves or an admin
    if (
      req.user.role !== 'admin' &&
      teacher.userId !== req.user.id
    ) {
      return res.status(403).json({ message: 'Not authorized to create courses for this teacher' });
    }

    // Extract course details from the request
    const { 
      name, 
      description, 
      courseCode, 
      creditHours, 
      semester,
      startDate, 
      endDate, 
      schedule,
      capacity,
      prerequisites,
      department
    } = req.body;

    // Create the course
    const course = await Course.create({
      teacherId,
      name,
      description,
      courseCode,
      credits: creditHours, // Map creditHours to credits field in the database
      semester,
      startDate,
      endDate,
      schedule,
      capacity,
      prerequisites: prerequisites || [], // Store prerequisites as JSON array
      department,
      isActive: true
    });

    res.status(201).json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Create a new assignment
// @route   POST /api/teachers/:id/courses/:courseId/assignments
// @access  Private/Teacher/Admin
const createAssignment = async (req, res) => {
  try {
    const { id: teacherId, courseId } = req.params;
    
    // Verify the course exists and belongs to this teacher
    const course = await Course.findOne({
      where: { id: courseId, teacherId }
    });
    
    if (!course) {
      return res.status(404).json({ 
        message: 'Course not found or you are not the instructor of this course'
      });
    }

    // Extract assignment details from the request
    const { 
      title, 
      description, 
      dueDate, 
      totalMarks, 
      assignmentType,
      weightage,
      assignmentNumber 
    } = req.body;

    // Create the assignment data object
    const assignmentData = {
      courseId,
      createdBy: teacherId,
      title,
      description,
      dueDate,
      totalPoints: totalMarks || 100,
      type: assignmentType || 'homework',
      assignmentNumber: assignmentNumber || null,
      weightage,
      visibleToStudents: req.body.isActive === 'on' || req.body.isActive === true
    };

    // If there's a file uploaded, add the file information
    if (req.file) {
      // Get the relative path for storage in the database
      const relativePath = `/uploads/assignments/${req.file.filename}`;
      
      assignmentData.filePath = relativePath;
      assignmentData.fileName = req.file.filename;
      assignmentData.fileOriginalName = req.file.originalname;
      assignmentData.fileSize = req.file.size;
      assignmentData.fileType = req.file.mimetype;
    }

    // Create the assignment
    const assignment = await Assignment.create(assignmentData);

    // Check if this is an HTML request or JSON API request
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      // Redirect to the dashboard or course view
      return res.redirect('/teacher/dashboard');
    } else {
      // Return JSON response
      res.status(201).json({
        message: 'Assignment created successfully',
        assignment
      });
    }
  } catch (error) {
    console.error('Assignment Creation Error:', error);
    
    // Check if this is an HTML request or JSON API request
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return res.status(500).render('error', { 
        message: 'Error creating assignment',
        error: { status: 500 }
      });
    } else {
      res.status(500).json({ message: 'Server Error', error: error.message });
    }
  }
};

// @desc    Grade a submission
// @route   POST /api/teachers/:id/submissions/:submissionId/grade
// @access  Private/Teacher/Admin
const gradeSubmission = async (req, res) => {
  try {
    const { id: teacherId, submissionId } = req.params;
    const { grade, feedback } = req.body;

    // Find the submission
    const submission = await Submission.findByPk(submissionId, {
      include: [{
        model: Assignment,
        include: [{
          model: Course,
          where: { teacherId }
        }]
      }]
    });

    if (!submission) {
      return res.status(404).json({ 
        message: 'Submission not found or you are not the instructor of the related course'
      });
    }

    // Update submission with grade
    submission.grade = grade;
    submission.feedback = feedback;
    submission.status = 'graded';
    
    await submission.save();

    // Create or update a grade record
    const existingGrade = await Grade.findOne({
      where: {
        studentId: submission.studentId,
        courseId: submission.Assignment.courseId,
        assignmentId: submission.assignmentId
      }
    });

    if (existingGrade) {
      existingGrade.value = grade;
      existingGrade.notes = feedback;
      existingGrade.gradedBy = req.user.id;
      existingGrade.gradedDate = new Date();
      
      await existingGrade.save();
    } else {
      await Grade.create({
        studentId: submission.studentId,
        courseId: submission.Assignment.courseId,
        assignmentId: submission.assignmentId,
        value: grade,
        type: submission.Assignment.assignmentType,
        weight: submission.Assignment.weightage,
        notes: feedback,
        gradedBy: req.user.id
      });
    }

    res.json({
      message: 'Submission graded successfully',
      submission
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Record attendance
// @route   POST /api/teachers/:id/courses/:courseId/attendance
// @access  Private/Teacher/Admin
const recordAttendance = async (req, res) => {
  try {
    const { id: teacherId, courseId } = req.params;
    const { date, students } = req.body;
    
    // Verify the course exists and belongs to this teacher
    const course = await Course.findOne({
      where: { id: courseId, teacherId }
    });
    
    if (!course) {
      return res.status(404).json({ 
        message: 'Course not found or you are not the instructor of this course'
      });
    }

    // Array to store created/updated attendance records
    const attendanceRecords = [];

    // Process each student's attendance
    for (const studentAttendance of students) {
      const { studentId, status, notes } = studentAttendance;
      
      // Check if student is enrolled in the course
      const enrollment = await Enrollment.findOne({
        where: { studentId, courseId }
      });
      
      if (!enrollment) {
        continue; // Skip if student is not enrolled
      }

      // Check if attendance record already exists for this date
      let attendance = await Attendance.findOne({
        where: { 
          studentId,
          courseId,
          date: new Date(date)
        }
      });

      if (attendance) {
        // Update existing attendance
        attendance.status = status;
        attendance.notes = notes;
        attendance.recordedBy = req.user.id;
        
        await attendance.save();
        attendanceRecords.push(attendance);
      } else {
        // Create new attendance record
        attendance = await Attendance.create({
          studentId,
          courseId,
          date: new Date(date),
          status,
          notes,
          recordedBy: req.user.id
        });
        
        attendanceRecords.push(attendance);
      }
    }

    res.status(201).json({
      message: 'Attendance recorded successfully',
      attendanceRecords
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * Get all assignments for a teacher
 * @route GET /teacher/assignments
 * @access Private/Teacher
 */
const getTeacherAssignments = async (req, res) => {
  try {
    // Get the teacher ID from the currently logged in user
    const teacher = await Teacher.findOne({ 
      where: { userId: req.user.id },
      include: [{ model: User, attributes: ['firstName', 'lastName', 'email'] }]
    });
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher profile not found' });
    }

    // Find all courses taught by this teacher
    const courses = await Course.findAll({ where: { teacherId: teacher.id } });
    
    if (courses.length === 0) {
      return res.render('teacher/assignments', { 
        title: 'My Assignments',
        user: req.user,
        teacher,
        assignments: [],
        layout: 'layouts/teacher'
      });
    }

    try {
      const assignments = await Assignment.findAll({ 
        where: { 
          courseId: courses.map(course => course.id) 
        },
        include: [{ 
          model: Course,
          required: false
        }]
      });
      
      res.render('teacher/assignments', { 
        title: 'My Assignments',
        user: req.user,
        teacher,
        assignments,
        layout: 'layouts/teacher'
      });
    } catch (err) {
      res.render('teacher/assignments', { 
        title: 'My Assignments',
        user: req.user,
        teacher,
        assignments: [],
        error: 'Failed to load assignments'
      });
    }
  } catch (error) {
    if (req.accepts('html')) {
      return res.status(500).render('error', { 
        message: 'Server Error', 
        error: { 
          status: 500, 
          stack: process.env.NODE_ENV === 'production' ? null : error.stack 
        } 
      });
    }
    
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    View all students
// @route   GET /teacher/all-students
// @access  Private/Teacher
const viewAllStudents = async (req, res) => {
  try {
    const students = await Student.findAll({
      include: [{
        model: User,
        attributes: ['firstName', 'lastName', 'email'] // Specify attributes to include from User model
      }],
      order: [[{ model: User }, 'lastName', 'ASC']] // Optionally, order by last name
    });
    res.render('teacher/all-students', {
      title: 'All Students',
      students,
      user: req.user, // Add this line
      layout: './layouts/teacher' // Assuming you have a teacher-specific layout
    });
  } catch (error) {
    console.error('Error fetching all students:', error);
    res.status(500).send('Server error');
  }
};

// @desc    View details of a specific course taught by the teacher
// @route   GET /teacher/courses/:courseId
// @access  Private/Teacher
const viewCourseDetails = async (req, res) => {
  try {
    const teacherProfile = await Teacher.findOne({ where: { userId: req.user.id } });
    if (!teacherProfile) {
      req.flash('error', 'Teacher profile not found.');
      return res.redirect('/teacher/dashboard');
    }

    const course = await Course.findOne({
      where: {
        id: req.params.courseId,
        teacherId: teacherProfile.id 
      },
      include: [
        { model: Assignment, order: [['createdAt', 'DESC']] },
        { 
          model: Enrollment,
          include: [
            { 
              model: Student,
              include: [User] // Include User model for student details
            }
          ]
        }
      ]
    });

    if (!course) {
      req.flash('error', 'Course not found or you are not authorized to view it.');
      return res.redirect('/teacher/dashboard');
    }

    res.render('teacher/course-detail', {
      title: `Course Details - ${course.name}`,
      user: req.user,
      course,
      assignments: course.Assignments || [],
      enrollments: course.Enrollments || [],
      layout: 'layouts/teacher',
      currentPath: `/teacher/courses/${course.id}`
    });
  } catch (error) {
    console.error('Error fetching course details for teacher:', error);
    req.flash('error', 'Failed to load course details.');
    res.redirect('/teacher/dashboard');
  }
};

module.exports = {
  renderDashboard,
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
};