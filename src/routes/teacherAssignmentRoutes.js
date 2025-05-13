// filepath: c:\Users\MUHAMMAD ALI\OneDrive\Desktop\CS232-F (DBMS)\project\LMS\src\routes\teacherAssignmentRoutes.js
const express = require('express');
const router = express.Router();
const { protect, teacher } = require('../middleware/authMiddleware');
const { uploadAssignmentPDF } = require('../middleware/fileUploadMiddleware');
const { Assignment, Course, Teacher } = require('../models');

// Display assignment list for the teacher
router.get('/', protect, teacher, async (req, res) => {
    try {
        const teacherProfile = await Teacher.findOne({ where: { userId: req.user.id } });
        
        if (!teacherProfile) {
            req.flash('error', 'Teacher profile not found.');
            return res.status(404).redirect('/teacher/dashboard');
        }
        
        // Fetch teacher's courses
        const courses = await Course.findAll({ 
            where: { teacherId: teacherProfile.id }
        });
        
        // Fetch assignments for those courses
        const assignments = await Assignment.findAll({
            where: { courseId: courses.map(c => c.id) },
            include: [{
                model: Course,
                required: false
            }]
        });
          res.render('teacher/assignments', {
            title: 'My Assignments',
            user: req.user,
            assignments: assignments,
            layout: 'layouts/teacher'
        });
    } catch (error) {
        console.error('Error loading assignments:', error);
        req.flash('error', 'Failed to load assignments.');
        res.status(500).render('error', { message: 'Error loading assignments', statusCode: 500 });
    }
});

// View assignment details
router.get('/:id', protect, teacher, async (req, res) => {
    try {
        const assignmentId = req.params.id;
        const teacherProfile = await Teacher.findOne({ where: { userId: req.user.id } });
        
        if (!teacherProfile) {
            req.flash('error', 'Teacher profile not found.');
            return res.status(404).redirect('/teacher/dashboard');
        }
        
        // Find the assignment and verify it belongs to this teacher's course
        const assignment = await Assignment.findOne({
            where: { id: assignmentId },
            include: [{
                model: Course,
                where: { teacherId: teacherProfile.id },
                required: true
            }]
        });
        
        if (!assignment) {
            req.flash('error', 'Assignment not found or you do not have permission to view it.');
            return res.status(404).redirect('/teacher/assignments');
        }
          res.render('teacher/assignment-detail', {
            title: `Assignment: ${assignment.title}`,
            user: req.user,
            assignment: assignment,
            layout: 'layouts/teacher'
        });
    } catch (error) {
        console.error('Error loading assignment details:', error);
        req.flash('error', 'Failed to load assignment details.');
        res.status(500).render('error', { message: 'Error loading assignment details', statusCode: 500 });
    }
});

// View submissions for an assignment
router.get('/:id/submissions', protect, teacher, async (req, res) => {
    try {
        const assignmentId = req.params.id;
        const teacherProfile = await Teacher.findOne({ where: { userId: req.user.id } });
        
        if (!teacherProfile) {
            req.flash('error', 'Teacher profile not found.');
            return res.status(404).redirect('/teacher/dashboard');
        }
        
        // Find the assignment and verify it belongs to this teacher's course
        const assignment = await Assignment.findOne({
            where: { id: assignmentId },
            include: [{
                model: Course,
                where: { teacherId: teacherProfile.id },
                required: true
            }]
        });
        
        if (!assignment) {
            req.flash('error', 'Assignment not found or you do not have permission to view it.');
            return res.status(404).redirect('/teacher/assignments');
        }
        
        // Get submissions for this assignment
        const { Submission, Student, User } = require('../models');
        const submissions = await Submission.findAll({
            where: { assignmentId: assignmentId },
            include: [{
                model: Student,
                include: [{
                    model: User,
                    attributes: ['firstName', 'lastName', 'email']
                }]
            }]
        });
          res.render('teacher/assignment-submissions', {
            title: `Submissions: ${assignment.title}`,
            user: req.user,
            assignment: assignment,
            submissions: submissions,
            layout: 'layouts/teacher'
        });
    } catch (error) {
        console.error('Error loading submissions:', error);
        req.flash('error', 'Failed to load assignment submissions.');
        res.status(500).render('error', { message: 'Error loading submissions', statusCode: 500 });
    }
});

// Show form to create a new assignment
router.get('/new', protect, teacher, async (req, res) => {
    try {
        const teacherProfile = await Teacher.findOne({ where: { userId: req.user.id } });
        
        if (!teacherProfile) {
            req.flash('error', 'Teacher profile not found.');
            return res.status(404).redirect('/teacher/dashboard');
        }
        
        // Get courses taught by this teacher
        const courses = await Course.findAll({ 
            where: { teacherId: teacherProfile.id, isActive: true }
        });
          res.render('teacher/assignment-form', {
            title: 'Create New Assignment',
            courses: courses,
            assignment: null,
            user: req.user,
            layout: 'layouts/teacher'
        });
    } catch (error) {
        console.error('Error loading assignment form:', error);
        req.flash('error', 'Failed to load assignment form.');
        res.status(500).render('error', { message: 'Error loading assignment form', statusCode: 500 });
    }
});

// Show form to edit an existing assignment
router.get('/:id/edit', protect, teacher, async (req, res) => {
    try {
        const assignmentId = req.params.id;
        const teacherProfile = await Teacher.findOne({ where: { userId: req.user.id } });
        
        if (!teacherProfile) {
            req.flash('error', 'Teacher profile not found.');
            return res.status(404).redirect('/teacher/dashboard');
        }
        
        // Get courses taught by this teacher
        const courses = await Course.findAll({ 
            where: { teacherId: teacherProfile.id }
        });
        
        // Get the assignment details
        const assignment = await Assignment.findOne({
            where: { 
                id: assignmentId,
                courseId: courses.map(c => c.id) // Ensure the assignment belongs to one of teacher's courses
            }
        });
        
        if (!assignment) {
            req.flash('error', 'Assignment not found or you do not have permission to edit it.');
            return res.redirect('/teacher/assignments');
        }
          res.render('teacher/assignment-form', {
            title: 'Edit Assignment',
            courses: courses,
            assignment: assignment,
            user: req.user,
            layout: 'layouts/teacher'
        });
    } catch (error) {
        console.error('Error loading edit assignment form:', error);
        req.flash('error', 'Failed to load assignment form.');
        res.status(500).render('error', { message: 'Error loading assignment form', statusCode: 500 });
    }
});

// Process assignment form (create or update)
router.post('/submit', protect, teacher, uploadAssignmentPDF.single('file'), async (req, res) => {
    try {
        const { _method, assignmentId, courseId, title, description, dueDate, totalMarks, 
               assignmentType, weightage, assignmentNumber } = req.body;
        
        // Check if the teacher has access to this course
        const teacherProfile = await Teacher.findOne({ where: { userId: req.user.id } });
        
        if (!teacherProfile) {
            req.flash('error', 'Teacher profile not found.');
            return res.redirect('/teacher/dashboard');
        }
        
        const course = await Course.findOne({
            where: { 
                id: courseId,
                teacherId: teacherProfile.id
            }
        });
        
        if (!course) {
            req.flash('error', 'Course not found or you do not have permission to add assignments to it.');
            return res.redirect('/teacher/assignments');
        }
        
        // Check if this is an update or create operation
        const isUpdate = _method === 'PUT';
        const isActive = req.body.isActive === 'on' || req.body.isActive === true;
        
        // Prepare assignment data
        const assignmentData = {
            courseId,
            title,
            description,
            dueDate,
            totalMarks: parseInt(totalMarks),
            assignmentType: assignmentType || 'homework',
            weightage: parseInt(weightage) || 10,
            assignmentNumber: assignmentNumber ? parseInt(assignmentNumber) : null,
            isActive
        };
        
        // If there's a file uploaded, add the file information
        if (req.file) {
            // Get the relative path for storage in the database
            const relativePath = `/uploads/assignments/${req.file.filename}`;
            
            assignmentData.filePath = relativePath;
            assignmentData.fileOriginalName = req.file.originalname;
            assignmentData.fileSize = req.file.size;
        }
        
        let assignment;
        
        if (isUpdate) {
            // Update existing assignment
            assignment = await Assignment.findOne({
                where: { 
                    id: assignmentId,
                    courseId: course.id // Ensure it belongs to the teacher's course
                }
            });
            
            if (!assignment) {
                req.flash('error', 'Assignment not found or you do not have permission to edit it.');
                return res.redirect('/teacher/assignments');
            }
            
            await assignment.update(assignmentData);
            req.flash('success', 'Assignment updated successfully!');
        } else {
            // Create new assignment
            assignmentData.createdBy = teacherProfile.id;
            assignment = await Assignment.create(assignmentData);
            req.flash('success', 'Assignment created successfully!');
        }
        
        res.redirect('/teacher/assignments');
    } catch (error) {
        console.error('Error processing assignment form:', error);
        req.flash('error', 'Failed to save assignment. Please check your inputs and try again.');
        res.redirect('/teacher/assignments/new');
    }
});

// Delete an assignment
router.post('/:id/delete', protect, teacher, async (req, res) => {
    try {
        const assignmentId = req.params.id;
        const teacherProfile = await Teacher.findOne({ where: { userId: req.user.id } });
        
        if (!teacherProfile) {
            req.flash('error', 'Teacher profile not found.');
            return res.redirect('/teacher/dashboard');
        }
        
        // Get courses taught by this teacher
        const courses = await Course.findAll({ 
            where: { teacherId: teacherProfile.id }
        });
        
        // Find the assignment
        const assignment = await Assignment.findOne({
            where: { 
                id: assignmentId,
                courseId: courses.map(c => c.id) // Ensure it belongs to the teacher's courses
            }
        });
        
        if (!assignment) {
            req.flash('error', 'Assignment not found or you do not have permission to delete it.');
            return res.redirect('/teacher/assignments');
        }
        
        await assignment.destroy();
        req.flash('success', 'Assignment deleted successfully!');
        res.redirect('/teacher/assignments');
    } catch (error) {
        console.error('Error deleting assignment:', error);
        req.flash('error', 'Failed to delete assignment.');
        res.redirect('/teacher/assignments');
    }
});

module.exports = router;