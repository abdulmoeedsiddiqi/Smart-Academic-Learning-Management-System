const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Assignment = require('./Assignment');
const Student = require('./Student');

const Submission = sequelize.define('Submission', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  assignmentId: {
    type: DataTypes.UUID,
    references: {
      model: 'Assignments',
      key: 'id'
    },
    allowNull: false
  },
  studentId: {
    type: DataTypes.UUID,
    references: {
      model: 'Students',
      key: 'id'
    },
    allowNull: false
  },
  submissionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true
  },
  score: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('submitted', 'graded', 'late', 'resubmitted'),
    defaultValue: 'submitted'
  },
  isLate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  attemptNumber: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  gradedBy: {
    type: DataTypes.UUID,
    allowNull: true
  },
  gradedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  comments: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['assignmentId', 'studentId', 'attemptNumber']
    }
  ]
});

// Establish relationships
Submission.belongsTo(Assignment, { foreignKey: 'assignmentId' });
Submission.belongsTo(Student, { foreignKey: 'studentId' });

Assignment.hasMany(Submission, { foreignKey: 'assignmentId' });
Student.hasMany(Submission, { foreignKey: 'studentId' });

module.exports = Submission;