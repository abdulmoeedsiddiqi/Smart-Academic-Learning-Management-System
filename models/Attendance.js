const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Student = require('./Student');
const Course = require('./Course');

const Attendance = sequelize.define('Attendance', {
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
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('present', 'absent', 'late', 'excused'),
    allowNull: false,
    defaultValue: 'present'
  },
  arrivalTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  departureTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  comments: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  recordedBy: {
    type: DataTypes.UUID,
    allowNull: true
  },
  sessionType: {
    type: DataTypes.ENUM('lecture', 'lab', 'discussion', 'exam', 'other'),
    defaultValue: 'lecture',
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['studentId', 'courseId', 'date']
    }
  ]
});

// Establish relationships
Attendance.belongsTo(Student, { foreignKey: 'studentId' });
Attendance.belongsTo(Course, { foreignKey: 'courseId' });

Student.hasMany(Attendance, { foreignKey: 'studentId' });
Course.hasMany(Attendance, { foreignKey: 'courseId' });

module.exports = Attendance;
