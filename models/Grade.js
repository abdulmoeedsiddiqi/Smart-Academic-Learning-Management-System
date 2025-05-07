const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Student = require('./Student');
const Course = require('./Course');
const Assignment = require('./Assignment');
const Submission = require('./Submission');

const Grade = sequelize.define('Grade', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  studentId: {
    type: DataTypes.UUID,
    references: {
      model: 'Students',
      key: 'id'
    },
    allowNull: false
  },
  courseId: {
    type: DataTypes.UUID,
    references: {
      model: 'Courses',
      key: 'id'
    },
    allowNull: false
  },
  assignmentId: {
    type: DataTypes.UUID,
    references: {
      model: 'Assignments',
      key: 'id'
    },
    allowNull: true
  },
  submissionId: {
    type: DataTypes.UUID,
    references: {
      model: 'Submissions',
      key: 'id'
    },
    allowNull: true
  },
  score: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  maxScore: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 100
  },
  percentage: {
    type: DataTypes.VIRTUAL,
    get() {
      return (this.score / this.maxScore) * 100;
    }
  },
  letterGrade: {
    type: DataTypes.STRING,
    allowNull: true
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  gradeType: {
    type: DataTypes.ENUM('assignment', 'exam', 'quiz', 'project', 'participation', 'final'),
    defaultValue: 'assignment'
  },
  weight: {
    type: DataTypes.FLOAT,
    defaultValue: 1.0,
    allowNull: false
  },
  gradedBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  gradedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['studentId', 'courseId', 'assignmentId', 'submissionId']
    }
  ]
});

// Establish relationships
Grade.belongsTo(Student, { foreignKey: 'studentId' });
Grade.belongsTo(Course, { foreignKey: 'courseId' });
Grade.belongsTo(Assignment, { foreignKey: 'assignmentId' });
Grade.belongsTo(Submission, { foreignKey: 'submissionId' });

Student.hasMany(Grade, { foreignKey: 'studentId' });
Course.hasMany(Grade, { foreignKey: 'courseId' });
Assignment.hasMany(Grade, { foreignKey: 'assignmentId' });
Submission.hasOne(Grade, { foreignKey: 'submissionId' });

module.exports = Grade;
