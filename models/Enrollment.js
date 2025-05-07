const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Student = require('./Student');
const Course = require('./Course');

const Enrollment = sequelize.define('Enrollment', {
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
  enrollmentDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'dropped', 'pending'),
    defaultValue: 'active'
  },
  finalGrade: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  completionDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['studentId', 'courseId']
    }
  ]
});

// Establish relationships
Enrollment.belongsTo(Student, { foreignKey: 'studentId' });
Enrollment.belongsTo(Course, { foreignKey: 'courseId' });

Student.belongsToMany(Course, { through: Enrollment, foreignKey: 'studentId' });
Course.belongsToMany(Student, { through: Enrollment, foreignKey: 'courseId' });

module.exports = Enrollment;
