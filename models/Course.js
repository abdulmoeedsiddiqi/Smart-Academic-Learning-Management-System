const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Teacher = require('./Teacher');

const Course = sequelize.define('Course', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  courseCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  teacherId: {
    type: DataTypes.UUID,
    references: {
      model: 'Teachers',
      key: 'id'
    },
    allowNull: true
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true
  },
  credits: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 3.0
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  schedule: {
    type: DataTypes.JSON,
    allowNull: true
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  semester: {
    type: DataTypes.STRING,
    allowNull: true
  },
  academicYear: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  syllabus: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  prerequisites: {
    type: DataTypes.JSON,
    allowNull: true
  },
  gradingScale: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  timestamps: true
});

// Associations are defined in index.js

module.exports = Course;
