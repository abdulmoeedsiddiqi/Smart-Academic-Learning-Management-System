const { Course, Teacher, Enrollment, Student, User, Assignment } = require('../models');

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.findAll({
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
    });

    res.json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get course by ID
// @route   GET /api/courses/:id
// @access  Public
const getCourseById = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id, {
      include: [
        {
          model: Teacher,
          as: 'courseTeacher', // Changed alias from 'instructor' to 'courseTeacher'
          attributes: ['firstName', 'lastName', 'email'] // Specify attributes to include
        },
        {
          model: Assignment,
          as: 'assignments', // Assuming 'assignments' is the correct alias for Course -> Assignments
          attributes: ['title', 'description', 'dueDate', 'totalPoints'] // Specify attributes
        }
      ]
    });

    if (!course) {
      const error = new Error('Course not found');
      error.status = 404;
      return next(error);
    }

    res.render('course-detail', {
      title: course.title,
      course,
      user: req.user
    });
  } catch (error) {
    console.error('Error fetching course by ID:', error);
    next(error);
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private/Teacher/Admin
const updateCourse = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if the user is the course instructor or an admin
    const teacher = await Teacher.findByPk(course.teacherId);
    
    if (
      req.user.role !== 'admin' &&
      (!teacher || teacher.userId !== req.user.id)
    ) {
      return res.status(403).json({ message: 'Not authorized to update this course' });
    }

    // Update course fields
    const { 
      name, 
      description, 
      creditHours, 
      semester,
      startDate,
      endDate,
      schedule,
      capacity,
      isActive 
    } = req.body;
    
    course.name = name || course.name;
    course.description = description || course.description;
    course.creditHours = creditHours || course.creditHours;
    course.semester = semester || course.semester;
    course.startDate = startDate || course.startDate;
    course.endDate = endDate || course.endDate;
    course.schedule = schedule || course.schedule;
    course.capacity = capacity || course.capacity;
    
    if (isActive !== undefined) {
      course.isActive = isActive;
    }
    
    await course.save();

    res.json({ message: 'Course updated successfully', course });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private/Admin
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    await course.destroy();

    res.json({ message: 'Course removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Enroll a student in a course
// @route   POST /api/courses/:id/enroll
// @access  Private/Admin
const enrollStudent = async (req, res) => {
  try {
    const courseId = req.params.id;
    const { studentId } = req.body;
    
    // Check if course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if student exists
    const student = await Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Check if student is already enrolled
    const existingEnrollment = await Enrollment.findOne({
      where: { studentId, courseId }
    });
    
    if (existingEnrollment) {
      return res.status(400).json({ message: 'Student is already enrolled in this course' });
    }
    
    // Check if course has reached capacity
    if (course.capacity && course.enrolledCount >= course.capacity) {
      return res.status(400).json({ message: 'Course has reached its capacity' });
    }
    
    // Create enrollment
    const enrollment = await Enrollment.create({
      studentId,
      courseId,
      status: 'active',
      enrollmentDate: new Date()
    });
    
    // Increment enrolled count
    course.enrolledCount += 1;
    await course.save();

    res.status(201).json({
      message: 'Student enrolled successfully',
      enrollment
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get enrolled students for a course
// @route   GET /api/courses/:id/students
// @access  Private/Teacher/Admin
const getCourseStudents = async (req, res) => {
  try {
    const courseId = req.params.id;
    
    // Check if course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if the user is the course instructor or an admin
    if (req.user.role !== 'admin') {
      const teacher = await Teacher.findOne({ 
        where: { 
          userId: req.user.id,
          id: course.teacherId
        }
      });
      
      if (!teacher) {
        return res.status(403).json({ message: 'Not authorized to access this course data' });
      }
    }
    
    // Get enrolled students
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

    res.json(enrollments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get assignments for a course
// @route   GET /api/courses/:id/assignments
// @access  Private
const getCourseAssignments = async (req, res) => {
  try {
    const courseId = req.params.id;
    
    // Check if course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Get assignments for the course
    const assignments = await Assignment.findAll({
      where: { courseId }
    });

    res.json(assignments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all courses for a teacher by userId
// @route   GET /api/courses/teacher/:userId
// @access  Private
const getTeacherCoursesByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Find the teacher record for this user
    const teacher = await Teacher.findOne({ 
      where: { userId },
      include: [{ model: User, attributes: ['firstName', 'lastName'] }]
    });
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found for this user' });
    }

    // Get courses taught by the teacher
    const courses = await Course.findAll({
      where: { teacherId: teacher.id },
      include: [
        {
          model: Enrollment,
          attributes: ['id', 'studentId']
        }
      ]
    });

    res.json(courses);
  } catch (error) {
    console.error('Error fetching teacher courses by userId:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  enrollStudent,
  getCourseStudents,
  getCourseAssignments,
  getTeacherCoursesByUserId
};