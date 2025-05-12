const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Course = require('./Course');
const Teacher = require('./Teacher');

const Assignment = sequelize.define('Assignment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  courseId: {
    type: DataTypes.UUID,
    references: {
      model: 'Courses',
      key: 'id'
    },
    allowNull: false
  },
  createdBy: {
    type: DataTypes.UUID,
    references: {
      model: 'Teachers',
      key: 'id'
    },
    allowNull: false
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  publishDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  totalPoints: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 100
  },
  type: {
    type: DataTypes.ENUM('essay', 'quiz', 'project', 'exam', 'homework', 'other'),
    defaultValue: 'homework'
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    defaultValue: 'published'
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  resources: {
    type: DataTypes.JSON,
    allowNull: true
  },
  allowLateSubmission: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lateSubmissionDeduction: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  maxAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  visibleToStudents: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // New fields for assignment file uploads
  filePath: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fileOriginalName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  fileType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  assignmentNumber: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  timestamps: true
});

// Establish relationships
Assignment.belongsTo(Course, { foreignKey: 'courseId' });
Assignment.belongsTo(Teacher, { foreignKey: 'createdBy' });

Course.hasMany(Assignment, { foreignKey: 'courseId' });
Teacher.hasMany(Assignment, { foreignKey: 'createdBy' });

module.exports = Assignment;
