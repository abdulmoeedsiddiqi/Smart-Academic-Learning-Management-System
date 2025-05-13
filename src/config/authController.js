const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Student, Teacher } = require('../models');

// Ensure JWT_SECRET is available or use a fallback
const JWT_SECRET = process.env.JWT_SECRET || 'salams_lms_secret_key_for_secure_jwt_tokens';

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role, studentId } = req.body;
    
    // Check if user already exists
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // For student role, validate the student ID
    if (role === 'student') {
      // Ensure studentId is provided
      if (!studentId) {
        return res.status(400).json({ message: 'Student ID is required for student registration' });
      }
      
      // Validate that studentId is exactly 7 digits
      if (!/^\d{7}$/.test(studentId)) {
        return res.status(400).json({ message: 'Student ID must be exactly 7 digits' });
      }
      
      // Check if studentId already exists
      const existingStudentId = await Student.findOne({ where: { studentId } });
      if (existingStudentId) {
        return res.status(400).json({ message: 'Student ID already exists. Please use a different ID.' });
      }
    }    // Create user - password is stored as plain text as per project requirement
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role
    });

    // Based on role, create student or teacher record
    if (role === 'student') {
      // Use the provided studentId instead of generating one
      await Student.create({ 
        userId: user.id,
        studentId: studentId
      });
    } else if (role === 'teacher') {
      // Generate a unique teacherId if needed
      const currentYear = new Date().getFullYear();
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const teacherId = `T${currentYear}${randomDigits}`;
      
      await Teacher.create({ 
        userId: user.id,
        teacherId: teacherId 
      });
    }

    // Generate JWT token using the defined JWT_SECRET
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      token
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Check if email and password are provided
    if (!email || !password) {
      // Handle HTML vs JSON response differently
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        req.flash('error', 'Email and password are required');
        return res.redirect('/login');
      }
      res.status(400);
      throw new Error('Please provide email and password');
    }

    // Check if user exists
    const user = await User.findOne({ where: { email } });

    if (!user) {
      // Handle HTML vs JSON response differently
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        req.flash('error', 'Invalid email or password');
        return res.redirect('/login');
      }
      res.status(401);
      throw new Error('Invalid credentials');
    }    // Check if password is correct
    // Using direct comparison instead of bcrypt as per User model configuration
    const isMatch = user.password === password;
    
    if (!isMatch) {
      // Handle HTML vs JSON response differently
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        req.flash('error', 'Invalid email or password');
        return res.redirect('/login');
      }
      res.status(401);
      throw new Error('Invalid credentials');
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
    
    // Handle session for web
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      // Set the user in the session
      req.session.user = user;
      req.flash('success', 'You have successfully logged in');
      return res.redirect('/dashboard');
    }
    
    // Return user data and token for API
    res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};

/**
 * Get current user profile
 * @route GET /api/auth/me
 * @access Private
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 * @route POST /api/auth/logout
 * @access Private
 */
exports.logout = (req, res) => {
  // Check if API request (expects JSON) or web request (expects redirect)
  const isApiRequest = req.xhr || req.headers.accept?.includes('application/json');
  
  // Clear the token cookie regardless of request type
  res.clearCookie('token');
  
  // Handle Passport logout if available (for backwards compatibility)
  if (req.logout) {
    req.logout((err) => {
      if (err) {
        console.error('Error during passport logout:', err);
        // Continue with normal flow despite error
      }
      // Now handle the response after attempting passport logout
      if (isApiRequest) {
        return res.json({ message: 'Logged out successfully' });
      } else {
        req.flash('success', 'You have been logged out successfully.');
        return res.redirect('/');
      }
    });
  } else {
    // Fallback if req.logout is not available
    if (isApiRequest) {
      return res.json({ message: 'Logged out successfully' });
    } else {
      req.flash('success', 'You have been logged out successfully.');
      return res.redirect('/');
    }
  }
};

/**
 * Change password
 * @route PUT /api/auth/change-password
 * @access Private
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    // Check if current password is correct using bcrypt comparison
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update the password - will be hashed by model hooks
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};