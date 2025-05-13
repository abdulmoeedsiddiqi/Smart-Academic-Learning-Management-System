const express = require('express');
const path = require('path'); // Ensure path module is imported
const expressLayouts = require('express-ejs-layouts'); // Import express-ejs-layouts

// ... other imports ...

const app = express();

// View engine setup
app.use(expressLayouts); // Use express-ejs-layouts
app.set('view engine', 'ejs'); // Set EJS as the view engine
app.set('views', path.join(__dirname, 'views')); // Ensure views directory is set

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', require('./routes/index'));
app.use('/users', require('./routes/users'));
app.use('/courses', require('./routes/courseRoutes')); // Added to handle /courses path
app.use('/profile', require('./routes/profileRoutes')); // Ensure profile routes are mounted
app.use('/admin', require('./routes/adminRoutes')); // Ensure admin routes are mounted
app.use('/student', require('./src/routes/assignmentRoutes')); // Corrected path to assignment routes
app.use('/teacher/grades', require('./routes/teacherGradeRoutes')); // Teacher grade management routes
// In app.js, ensure the teacher assignments routes are properly mounted
// Create this file if needed// In app.js, ensure the teacher assignments routes are properly mounted
app.use('/teacher/assignments', require('./routes/teacherAssignmentRoutes')); // Create this file if needed
// Add Change Password Route
const { ensureAuthenticated } = require('./config/auth'); // Make sure auth middleware is required
app.get('/change-password', ensureAuthenticated, (req, res) => {
    // Assuming you have a view named 'change-password.ejs'
    // You might need a dedicated controller function later
    res.render('change-password', { 
        user: req.user, // Pass user info if needed by the view
        error: req.flash('error'), // Pass flash messages if used
        success_msg: req.flash('success_msg') 
    }); 
});
