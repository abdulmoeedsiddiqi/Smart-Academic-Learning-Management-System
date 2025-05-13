const express = require('express');
const router = express.Router();
const { protect, teacher } = require('../middleware/authMiddleware');
const axios = require('axios');
const { Teacher, Course, Student, Grade, Assignment, User, Enrollment } = require('../models');

// Define API URL for accessing the backend API
const API_URL = process.env.API_URL || 'http://localhost:5000';
console.log('Teacher grades route loaded (src version)');

// Teacher grades dashboard
router.get('/', protect, teacher, async (req, res) => {
  try {
    // Get teacher profile first
    const teacherProfile = await Teacher.findOne({ 
      where: { userId: req.user.id }
    });
    
    if (!teacherProfile) {
      req.flash('error_msg', 'Teacher profile not found');
      return res.status(404).redirect('/teacher/dashboard');
    }
    
    // Get courses taught by this teacher directly from the database
    const courses = await Course.findAll({
      where: { teacherId: teacherProfile.id }
    });      res.render('teacher/grades/dashboard', {
      title: 'Grade Management',
      courses: courses,
      user: req.user,
      layout: 'layouts/teacher'
    });
  } catch (error) {
    console.error('Error loading teacher grades page:', error);
    res.status(500).render('error', { 
      message: 'Failed to load grade management page', 
      error 
    });
  }
});

// View grades for a specific course
router.get('/course/:courseId', protect, teacher, async (req, res) => {
  try {
    const courseId = req.params.courseId;
    
    const teacherProfile = await Teacher.findOne({ 
      where: { userId: req.user.id }
    });
    
    if (!teacherProfile) {
      req.flash('error_msg', 'Teacher profile not found');
      return res.status(404).redirect('/teacher/dashboard');
    }
    
    const course = await Course.findOne({
      where: { 
        id: courseId,
        teacherId: teacherProfile.id
      }
    });
    
    if (!course) {
      req.flash('error_msg', 'Course not found or access denied');
      return res.redirect('/teacher/grades');
    }
    
    const grades = await Grade.findAll({
      where: { courseId },
      include: [
        {
          model: Student,
          as: 'Student', // Explicitly define alias if not default
          include: [{ model: User, as: 'User', attributes: ['firstName', 'lastName'] }] 
        },
        {
          model: Assignment,
          as: 'Assignment', // Explicitly define alias if not default
          attributes: ['title'] 
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.render('teacher/grades/course', {
      title: `Grades: ${course.name}`,
      course: course,
      grades: grades,
      user: req.user,
      layout: 'layouts/teacher'
    });
  } catch (error) {
    console.error('Error fetching course grades:', error);
    res.status(500).render('error', { 
      message: 'Failed to load course grades', 
      error 
    });
  }
});

// Form to add a new grade
router.get('/add/:courseId', protect, teacher, async (req, res) => {
  try {
    const courseId = req.params.courseId;
    
    // Get teacher profile
    const teacherProfile = await Teacher.findOne({ 
      where: { userId: req.user.id }
    });
    
    if (!teacherProfile) {
      req.flash('error_msg', 'Teacher profile not found');
      return res.status(404).redirect('/teacher/dashboard');
    }
    
    // Get course details directly from database
    const course = await Course.findOne({
      where: { 
        id: courseId,
        teacherId: teacherProfile.id // Make sure course belongs to this teacher
      }
    });
    
    if (!course) {
      req.flash('error_msg', 'Course not found or access denied');
      return res.redirect('/teacher/grades');
    }
    
    // Get students enrolled in this course directly from database
    const students = await Enrollment.findAll({
      where: { courseId },
      include: [
        {
          model: Student,
          include: [{ model: User, attributes: ['firstName', 'lastName'] }]
        }
      ]
    });      res.render('teacher/grades/add', {
      title: 'Add New Grade',
      course: course,
      students: students,
      user: req.user,
      layout: 'layouts/teacher'
    });
  } catch (error) {
    console.error('Error loading add grade form:', error);
    res.status(500).render('error', { 
      message: 'Failed to load add grade form', 
      error 
    });
  }
});

// Form to edit an existing grade
router.get('/edit/:gradeId', protect, teacher, async (req, res) => {
  try {
    const gradeId = req.params.gradeId;
    
    // Get teacher profile
    const teacherProfile = await Teacher.findOne({ 
      where: { userId: req.user.id }
    });
    
    if (!teacherProfile) {
      req.flash('error_msg', 'Teacher profile not found');
      return res.status(404).redirect('/teacher/dashboard');
    }
    
    // Get grade details directly from database
    const grade = await Grade.findByPk(gradeId, {
      include: [
        { model: Student, include: [{ model: User }] },
        { model: Assignment }
      ]
    });
    
    if (!grade) {
      req.flash('error_msg', 'Grade not found');
      return res.redirect('/teacher/grades');
    }
    
    // Get course details and verify it belongs to this teacher
    const course = await Course.findOne({
      where: { 
        id: grade.courseId,
        teacherId: teacherProfile.id // Make sure course belongs to this teacher
      }
    });
    
    if (!course) {
      req.flash('error_msg', 'Course not found or access denied');
      return res.redirect('/teacher/grades');
    }      res.render('teacher/grades/edit', {
      title: 'Edit Grade',
      grade: grade,
      course: course,
      user: req.user,
      layout: 'layouts/teacher'
    });
  } catch (error) {
    console.error('Error loading edit grade form:', error);
    res.status(500).render('error', { 
      message: 'Failed to load edit grade form', 
      error 
    });
  }
});

// Handle form submission to create a new grade
router.post('/add', protect, teacher, async (req, res) => {
  try {
    const { studentId, courseId, assignmentName, score, maxScore, weight } = req.body;
    
    // Get teacher profile
    const teacherProfile = await Teacher.findOne({ 
      where: { userId: req.user.id }
    });
    
    if (!teacherProfile) {
      req.flash('error_msg', 'Teacher profile not found');
      return res.status(404).redirect('/teacher/dashboard');
    }
    
    // Verify course belongs to this teacher
    const course = await Course.findOne({
      where: { 
        id: courseId,
        teacherId: teacherProfile.id
      }
    });
    
    if (!course) {
      req.flash('error_msg', 'Course not found or access denied');
      return res.redirect('/teacher/grades');
    }
    
    // Create the grade directly in the database
    await Grade.create({
      studentId,
      courseId,
      assignmentName,
      score: parseFloat(score),
      maxScore: parseFloat(maxScore || 100),
      weight: parseFloat(weight || 1),
      gradedBy: req.user.id,
      dateGraded: new Date()
    });
    
    req.flash('success', 'Grade added successfully!');
    res.redirect(`/teacher/grades/course/${courseId}`);
  } catch (error) {
    console.error('Error adding grade:', error);
    req.flash('error', 'Failed to add grade');
    res.redirect(`/teacher/grades/add/${req.body.courseId}`);
  }
});

// Handle form submission to update a grade
router.post('/update/:gradeId', protect, teacher, async (req, res) => {
  try {
    const gradeId = req.params.gradeId;
    const { assignmentName, score, maxScore, weight, courseId } = req.body;
    
    // Get teacher profile
    const teacherProfile = await Teacher.findOne({ 
      where: { userId: req.user.id }
    });
    
    if (!teacherProfile) {
      req.flash('error_msg', 'Teacher profile not found');
      return res.status(404).redirect('/teacher/dashboard');
    }
    
    // Get course and verify it belongs to this teacher
    const course = await Course.findOne({
      where: { 
        id: courseId,
        teacherId: teacherProfile.id
      }
    });
    
    if (!course) {
      req.flash('error_msg', 'Course not found or access denied');
      return res.redirect('/teacher/grades');
    }
    
    // Find the grade and update it
    const grade = await Grade.findByPk(gradeId);
    
    if (!grade || grade.courseId != courseId) {
      req.flash('error_msg', 'Grade not found or does not belong to this course');
      return res.redirect(`/teacher/grades/course/${courseId}`);
    }
    
    // Update grade directly in database
    await grade.update({
      assignmentName,
      score: parseFloat(score),
      maxScore: parseFloat(maxScore || 100),
      weight: parseFloat(weight || 1),
      updatedBy: req.user.id,
      updatedAt: new Date()
    });
    
    req.flash('success', 'Grade updated successfully!');
    res.redirect(`/teacher/grades/course/${courseId}`);
  } catch (error) {
    console.error('Error updating grade:', error);
    req.flash('error', 'Failed to update grade');
    res.redirect(`/teacher/grades/edit/${req.params.gradeId}`);
  }
});

// Handle grade deletion
router.post('/delete/:gradeId', protect, teacher, async (req, res) => {
  try {
    const gradeId = req.params.gradeId;
    const { courseId } = req.body;
    
    // Get teacher profile
    const teacherProfile = await Teacher.findOne({ 
      where: { userId: req.user.id }
    });
    
    if (!teacherProfile) {
      req.flash('error_msg', 'Teacher profile not found');
      return res.status(404).redirect('/teacher/dashboard');
    }
    
    // Get course and verify it belongs to this teacher
    const course = await Course.findOne({
      where: { 
        id: courseId,
        teacherId: teacherProfile.id
      }
    });
    
    if (!course) {
      req.flash('error_msg', 'Course not found or access denied');
      return res.redirect('/teacher/grades');
    }
    
    // Find the grade and delete it
    const grade = await Grade.findByPk(gradeId);
    
    if (!grade || grade.courseId != courseId) {
      req.flash('error_msg', 'Grade not found or does not belong to this course');
      return res.redirect(`/teacher/grades/course/${courseId}`);
    }
    
    // Delete grade directly from database
    await grade.destroy();
    
    req.flash('success', 'Grade deleted successfully!');
    res.redirect(`/teacher/grades/course/${courseId}`);
  } catch (error) {
    console.error('Error deleting grade:', error);
    req.flash('error', 'Failed to delete grade');
    res.redirect(`/teacher/grades/course/${req.body.courseId}`);
  }
});

module.exports = router;
