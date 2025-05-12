const jwt = require('jsonwebtoken');
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
    }

    // Create user - password will be hashed by the model hooks
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

    // Check if user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Direct password comparison since we're storing plain text passwords
    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token using the defined JWT_SECRET
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Check if API request (expects JSON) or web request (expects redirect)
    const isApiRequest = req.xhr || req.headers.accept?.includes('application/json');
    
    if (isApiRequest) {
      // Return JSON response for API clients
      return res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        token,
        message: `Welcome back, ${user.firstName}!`
      });
    } else {
      // Set token in cookie for web clients
      res.cookie('token', token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        sameSite: 'strict'
      });
      
      // Update last login time
      await User.update(
        { lastLogin: new Date() },
        { where: { id: user.id } }
      );
      
      // Set success message in flash to be displayed on dashboard
      req.session = req.session || {};
      req.session.welcomeMessage = `Welcome back, ${user.firstName}!`;
      
      // Redirect based on user role
      switch (user.role) {
        case 'admin':
          return res.redirect('/admin/dashboard');
        case 'teacher':
          return res.redirect('/teacher/dashboard');
        case 'student':
          return res.redirect('/student/dashboard');
        default:
          return res.redirect('/');
      }
    }
  } catch (error) {
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
  
  if (isApiRequest) {
    // Return JSON response for API clients
    return res.json({ message: 'Logged out successfully' });
  } else {
    // Redirect to homepage for web clients
    return res.redirect('/');
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
