const { Grade, Student, Course, Assignment, Teacher, User } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all grades
// @route   GET /api/grades
// @access  Private/Admin
const getGrades = async (req, res) => {
  try {
    // Get query params for filtering
    const { courseId, studentId, type } = req.query;
    
    // Build filter object
    const filter = {};
    if (courseId) filter.courseId = courseId;
    if (studentId) filter.studentId = studentId;
    if (type) filter.type = type;
    
    const grades = await Grade.findAll({
      where: filter,
      include: [
        {
          model: Student,
          include: [
            {
              model: User,
              attributes: ['firstName', 'lastName', 'email']
            }
          ]
        },
        {
          model: Course,
          attributes: ['id', 'name', 'courseCode']
        },
        {
          model: Assignment,
          attributes: ['id', 'title', 'totalMarks', 'dueDate']
        }
      ],
      order: [['gradedDate', 'DESC']]
    });

    res.json(grades);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get grades by student
// @route   GET /api/grades/student/:studentId
// @access  Private
const getStudentGrades = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const { courseId, type } = req.query;
    
    // Check if student exists
    const student = await Student.findByPk(studentId, {
      include: [{ model: User }]
    });
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Check if the user is authorized to view this student's grades
    if (
      req.user.role !== 'admin' && 
      req.user.role !== 'teacher' && 
      student.userId !== req.user.id
    ) {
      return res.status(403).json({ 
        message: 'Not authorized to access grades for this student' 
      });
    }
    
    // Build filter object
    const filter = { studentId };
    if (courseId) filter.courseId = courseId;
    if (type) filter.type = type;
    
    // Get grades
    const grades = await Grade.findAll({
      where: filter,
      include: [
        {
          model: Course,
          attributes: ['id', 'name', 'courseCode']
        },
        {
          model: Assignment,
          attributes: ['id', 'title', 'totalMarks', 'dueDate', 'assignmentType']
        }
      ],
      order: [['gradedDate', 'DESC']]
    });

    // Calculate course averages
    const courseGrades = {};
    grades.forEach(grade => {
      if (!courseGrades[grade.courseId]) {
        courseGrades[grade.courseId] = {
          courseId: grade.courseId,
          courseName: grade.Course.name,
          courseCode: grade.Course.courseCode,
          totalWeight: 0,
          weightedSum: 0,
          grades: []
        };
      }
      
      courseGrades[grade.courseId].grades.push(grade);
      
      // Only count assignment grades in course average
      if (grade.assignmentId) {
        courseGrades[grade.courseId].totalWeight += grade.weight || 1;
        courseGrades[grade.courseId].weightedSum += 
          (grade.value * (grade.weight || 1));
      }
    });
    
    // Calculate weighted averages
    const courseAverages = Object.values(courseGrades).map(course => {
      return {
        ...course,
        average: course.totalWeight > 0 ? 
          (course.weightedSum / course.totalWeight).toFixed(2) : 'N/A',
        grades: undefined // Don't include individual grades in response
      };
    });

    res.json({
      student: {
        id: student.id,
        name: `${student.User.firstName} ${student.User.lastName}`,
        studentId: student.studentId
      },
      grades,
      courseAverages
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get grades by course
// @route   GET /api/grades/course/:courseId
// @access  Private/Teacher
const getCourseGrades = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const { studentId, assignmentId } = req.query;
    
    // Check if course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if teacher is associated with the course
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
      
      if (!teacher || teacher.id !== course.teacherId) {
        return res.status(403).json({ 
          message: 'Not authorized to access grades for this course' 
        });
      }
    }
    
    // Build filter object
    const filter = { courseId };
    if (studentId) filter.studentId = studentId;
    if (assignmentId) filter.assignmentId = assignmentId;
    
    // Get grades
    const grades = await Grade.findAll({
      where: filter,
      include: [
        {
          model: Student,
          include: [
            {
              model: User,
              attributes: ['firstName', 'lastName', 'email']
            }
          ]
        },
        {
          model: Assignment,
          attributes: ['id', 'title', 'totalMarks', 'dueDate', 'assignmentType']
        }
      ],
      order: [
        [{ model: Student }, { model: User }, 'lastName', 'ASC'],
        [{ model: Assignment }, 'dueDate', 'DESC']
      ]
    });

    // Calculate student averages for this course
    const studentGrades = {};
    grades.forEach(grade => {
      if (!studentGrades[grade.studentId]) {
        studentGrades[grade.studentId] = {
          studentId: grade.studentId,
          studentName: `${grade.Student.User.firstName} ${grade.Student.User.lastName}`,
          totalWeight: 0,
          weightedSum: 0,
          grades: []
        };
      }
      
      studentGrades[grade.studentId].grades.push(grade);
      studentGrades[grade.studentId].totalWeight += grade.weight || 1;
      studentGrades[grade.studentId].weightedSum += 
        (grade.value * (grade.weight || 1));
    });
    
    // Calculate weighted averages
    const studentAverages = Object.values(studentGrades).map(student => {
      return {
        ...student,
        average: student.totalWeight > 0 ? 
          (student.weightedSum / student.totalWeight).toFixed(2) : 'N/A'
      };
    });

    // Calculate class average
    const classAverage = studentAverages.length > 0 ? 
      (studentAverages.reduce((sum, student) => 
        sum + (student.average !== 'N/A' ? parseFloat(student.average) : 0), 0) / 
        studentAverages.filter(student => student.average !== 'N/A').length
      ).toFixed(2) : 'N/A';

    res.json({
      course: {
        id: course.id,
        name: course.name,
        courseCode: course.courseCode
      },
      grades,
      studentAverages,
      classAverage
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a grade
// @route   POST /api/grades
// @access  Private/Teacher
const createGrade = async (req, res) => {
  try {
    const { 
      studentId, 
      courseId, 
      assignmentId, 
      value, 
      type, 
      letterGrade,
      weight, 
      notes 
    } = req.body;
    
    // Check if student exists and is enrolled in the course
    const student = await Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Check if course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if teacher is associated with the course
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
      
      if (!teacher || teacher.id !== course.teacherId) {
        return res.status(403).json({ 
          message: 'Not authorized to create grades for this course' 
        });
      }
    }
    
    // Check if assignment exists if assignmentId is provided
    if (assignmentId) {
      const assignment = await Assignment.findOne({ 
        where: { id: assignmentId, courseId }
      });
      
      if (!assignment) {
        return res.status(404).json({ 
          message: 'Assignment not found or does not belong to the specified course' 
        });
      }
    }
    
    // Check if grade already exists
    const existingGrade = await Grade.findOne({
      where: { 
        studentId, 
        courseId,
        ...(assignmentId && { assignmentId })
      }
    });
    
    if (existingGrade) {
      return res.status(400).json({ 
        message: 'Grade already exists for this student, course, and assignment' 
      });
    }
    
    // Create grade record
    const grade = await Grade.create({
      studentId,
      courseId,
      assignmentId: assignmentId || null,
      value,
      letterGrade: letterGrade || null,
      type: type || (assignmentId ? 'assignment' : 'participation'),
      weight: weight || 1.0,
      notes: notes || '',
      gradedBy: req.user.id,
      gradedDate: new Date()
    });

    res.status(201).json({
      message: 'Grade created successfully',
      grade
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update a grade
// @route   PUT /api/grades/:id
// @access  Private/Teacher
const updateGrade = async (req, res) => {
  try {
    const gradeId = req.params.id;
    const { value, letterGrade, weight, notes } = req.body;
    
    // Find the grade record
    const grade = await Grade.findByPk(gradeId, {
      include: [
        {
          model: Course
        }
      ]
    });
    
    if (!grade) {
      return res.status(404).json({ message: 'Grade not found' });
    }
    
    // Check if teacher is associated with the course
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
      
      if (!teacher || teacher.id !== grade.Course.teacherId) {
        return res.status(403).json({ 
          message: 'Not authorized to update grades for this course' 
        });
      }
    }
    
    // Update grade record
    grade.value = value || grade.value;
    grade.letterGrade = letterGrade || grade.letterGrade;
    grade.weight = weight || grade.weight;
    grade.notes = notes || grade.notes;
    grade.gradedBy = req.user.id;
    grade.gradedDate = new Date();
    
    await grade.save();

    res.json({
      message: 'Grade updated successfully',
      grade
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete a grade
// @route   DELETE /api/grades/:id
// @access  Private/Teacher/Admin
const deleteGrade = async (req, res) => {
  try {
    const gradeId = req.params.id;
    
    // Find the grade record
    const grade = await Grade.findByPk(gradeId, {
      include: [
        {
          model: Course
        }
      ]
    });
    
    if (!grade) {
      return res.status(404).json({ message: 'Grade not found' });
    }
    
    // Check if teacher is associated with the course
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
      
      if (!teacher || teacher.id !== grade.Course.teacherId) {
        return res.status(403).json({ 
          message: 'Not authorized to delete grades for this course' 
        });
      }
    }
    
    // Delete grade record
    await grade.destroy();

    res.json({ message: 'Grade deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getGrades,
  getStudentGrades,
  getCourseGrades,
  createGrade,
  updateGrade,
  deleteGrade
};