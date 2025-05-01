const express = require('express');
const router = express.Router();
const { 
  getDashboardStats, 
  getUsersList, 
  createUser, 
  updateUser, 
  deleteUser,
  getSystemLogs
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

// All routes require both authentication and admin role
router.use(protect, admin);

// Admin dashboard
router.get('/dashboard', getDashboardStats);

// User management
router.get('/users', getUsersList);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// System logs
router.get('/logs', getSystemLogs);

module.exports = router;
