const { Assignment, Course, Teacher, Submission, Student, User, Enrollment } = require('../models');

// @desc    Get all assignments (filtered by query params)
// @route   GET /api/assignments
// @access  Private
const getAssignments = async (req, res) => {
  try {
    const { courseId, type } = req.query;

    // Build filter object
    const filter = {};
    if (courseId) filter.courseId = courseId;
    if (type) filter.assignmentType = type;

    const assignments = await Assignment.findAll({
      where: filter,
      include: [
        {
          model: Course,
          attributes: ['id', 'name', 'courseCode'],
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
      ],
      order: [['dueDate', 'ASC']]
    });

    res.json(assignments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get assignment by ID
// @route   GET /api/assignments/:id
// @access  Private
const getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id, {
      include: [
        {
          model: Course,
          attributes: ['id', 'name', 'courseCode'],
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

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    res.json(assignment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create new assignment
// @route   POST /api/assignments
// @access  Private/Teacher
const createAssignment = async (req, res) => {
  try {
    console.log('Create assignment request received:', req.body);
    console.log('File in request:', req.file);
    
    const { teacherId, courseId, title, description, dueDate, totalMarks, assignmentType, weightage, assignmentNumber } = req.body;
    
    // Validate required fields
    if (!teacherId || !courseId || !title || !description || !dueDate) {
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        return res.status(400).render('error', { 
          message: 'Missing required fields',
          error: { status: 400 }
        });
      }
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Verify the course exists and belongs to this teacher
    const course = await Course.findOne({
      where: { id: courseId, teacherId }
    });
    
    if (!course) {
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        return res.status(404).render('error', { 
          message: 'Course not found or you are not the instructor of this course',
          error: { status: 404 }
        });
      }
      return res.status(404).json({ 
        message: 'Course not found or you are not the instructor of this course'
      });
    }

    // Create the assignment data object - matching field names to the model
    const assignmentData = {
      courseId,
      createdBy: teacherId,
      title,
      description,
      dueDate: new Date(dueDate),
      totalPoints: totalMarks || 100, // totalMarks in form maps to totalPoints in model
      type: assignmentType || 'homework', // assignmentType in form maps to type in model
      assignmentNumber: assignmentNumber || null,
      weightage: weightage || 10,
      visibleToStudents: req.body.isActive === 'on' || req.body.isActive === true,
      status: 'published'
    };

    // If there's a file uploaded, add the file information
    if (req.file) {
      console.log('Processing uploaded file:', req.file);
      
      // Get the relative path for storage in the database
      const relativePath = `/uploads/assignments/${req.file.filename}`;
      
      assignmentData.filePath = relativePath;
      assignmentData.fileName = req.file.filename;
      assignmentData.fileOriginalName = req.file.originalname;
      assignmentData.fileSize = req.file.size;
      assignmentData.fileType = req.file.mimetype;
    }

    console.log('Creating assignment with data:', assignmentData);
    
    // Create the assignment
    const assignment = await Assignment.create(assignmentData);
    console.log('Assignment created successfully:', assignment.id);

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

// @desc    Update assignment
// @route   PUT /api/assignments/:id
// @access  Private/Teacher
const updateAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id, {
      include: [
        {
          model: Course,
          include: [
            {
              model: Teacher,
              as: 'courseTeacher' // Changed from 'instructor'
            }
          ]
        }
      ]
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if the logged-in user is the course instructor
    const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
    
    if (!teacher || teacher.id !== assignment.Course.teacherId) {
      return res.status(403).json({ message: 'Not authorized to update this assignment' });
    }

    // Update assignment fields
    const { 
      title, 
      description, 
      dueDate, 
      totalMarks, 
      assignmentType,
      weightage,
      isActive 
    } = req.body;

    assignment.title = title || assignment.title;
    assignment.description = description || assignment.description;
    assignment.dueDate = dueDate || assignment.dueDate;
    assignment.totalMarks = totalMarks || assignment.totalMarks;
    assignment.assignmentType = assignmentType || assignment.assignmentType;
    assignment.weightage = weightage || assignment.weightage;
    
    if (isActive !== undefined) {
      assignment.isActive = isActive;
    }
    
    await assignment.save();

    res.json({ message: 'Assignment updated successfully', assignment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete assignment
// @route   DELETE /api/assignments/:id
// @access  Private/Teacher
const deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id, {
      include: [
        {
          model: Course,
          include: [
            {
              model: Teacher,
              as: 'courseTeacher' // Changed from 'instructor'
            }
          ]
        }
      ]
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if the logged-in user is the course instructor
    const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
    
    if (!teacher || teacher.id !== assignment.Course.teacherId) {
      return res.status(403).json({ message: 'Not authorized to delete this assignment' });
    }

    await assignment.destroy();

    res.json({ message: 'Assignment removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get submissions for an assignment
// @route   GET /api/assignments/:id/submissions
// @access  Private/Teacher
const getSubmissions = async (req, res) => {
  try {
    const assignmentId = req.params.id;
    
    // Verify that the assignment exists
    const assignment = await Assignment.findByPk(assignmentId, {
      include: [
        {
          model: Course,
          include: [
            {
              model: Teacher,
              as: 'courseTeacher' // Changed from 'instructor'
            }
          ]
        }
      ]
    });
    
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if the logged-in user is the course instructor
    const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
    
    if (!teacher || teacher.id !== assignment.Course.teacherId) {
      return res.status(403).json({ message: 'Not authorized to view submissions for this assignment' });
    }

    // Get all submissions for the assignment
    const submissions = await Submission.findAll({
      where: { assignmentId },
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
      ],
      order: [['submissionDate', 'ASC']]
    });

    res.json(submissions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get assignments for courses a student is enrolled in and render page
// @route   GET /student/assignments
// @access  Private/Student
const getStudentAssignments = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).render('error', { message: 'User not authenticated or user ID missing.', error: { status: 401 }, user: req.user });
    }

    const student = await Student.findOne({ 
      where: { userId: req.user.id },
      attributes: ['id']
    });

    if (!student) {
      return res.render('student/assignments', {
        assignments: [], 
        user: req.user,
        title: 'My Assignments',
        courses: [],
        message: 'No student profile found. Contact administrator.',
        selectedCourseId: req.query.courseId || null,
        errorMessage: 'No student profile found. Contact administrator.'
      });
    }

    const studentId = student.id;
    
    const enrollments = await Enrollment.findAll({
      where: { studentId },
      attributes: ['courseId']
    });

    if (!enrollments || enrollments.length === 0) {
      return res.render('student/assignments', {
        assignments: [],
        user: req.user,
        title: 'My Assignments',
        courses: [],
        message: 'You are not currently enrolled in any courses.',
        selectedCourseId: req.query.courseId || null,
        errorMessage: 'You are not currently enrolled in any courses.'
      });
    }
    const courseIds = enrollments.map(enrollment => enrollment.courseId);

    let coursesForFilter = [];
    let assignments = [];

    assignments = await Assignment.findAll({
      where: {
        courseId: courseIds,
        visibleToStudents: true
      },
      include: [
        {
          model: Course,
          attributes: ['id', 'name', 'courseCode'],
        }
      ],
      order: [['dueDate', 'ASC']]
    });

    coursesForFilter = await Course.findAll({
      where: { id: courseIds },
      attributes: ['id', 'name', 'courseCode'],
      order: [['name', 'ASC']]
    });
    
    const pageMessage = assignments.length === 0 && enrollments.length > 0 ? 'No assignments found for your enrolled courses.' : null;

    res.render('student/assignments', {
      assignments, 
      user: req.user, 
      title: 'My Assignments',
      courses: coursesForFilter,
      selectedCourseId: req.query.courseId || null,
      errorMessage: null,
      message: pageMessage
    });

  } catch (error) {
    console.error('Error fetching and rendering student assignments:', error);
    res.status(500).render('error', { message: 'Server Error while loading assignments.', error , user: req.user });
  }
};

module.exports = {
  getAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getSubmissions,
  getStudentAssignments
};