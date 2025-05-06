const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

const Teacher = sequelize.define('Teacher', {
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
  teacherId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true
  },
  hireDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  qualification: {
    type: DataTypes.STRING,
    allowNull: true
  },
  specialization: {
    type: DataTypes.STRING,
    allowNull: true
  },
  experience: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'on_leave', 'retired', 'terminated'),
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
Teacher.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });
User.hasOne(Teacher, { foreignKey: 'userId' });

module.exports = Teacher;
