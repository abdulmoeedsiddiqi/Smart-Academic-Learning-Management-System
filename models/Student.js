const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

const Student = sequelize.define('Student', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    unique: true
  },
  studentId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  enrollmentDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  grade: {
    type: DataTypes.STRING,
    allowNull: true
  },
  section: {
    type: DataTypes.STRING,
    allowNull: true
  },
  parentName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  parentEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  parentPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'graduated', 'suspended', 'withdrawn'),
    defaultValue: 'active'
  },
  additionalInfo: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  timestamps: true
});

// Establish one-to-one relationship with User model
Student.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });
User.hasOne(Student, { foreignKey: 'userId' });

module.exports = Student;
