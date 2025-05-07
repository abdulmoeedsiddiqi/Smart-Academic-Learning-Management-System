const User = require('./User');
const Student = require('./Student');
const Teacher = require('./Teacher');
const Course = require('./Course');
const Enrollment = require('./Enrollment');
const Assignment = require('./Assignment');
const Submission = require('./Submission');
const Attendance = require('./Attendance');
const Grade = require('./Grade');

// User associations
User.hasOne(Student, { foreignKey: 'userId' });
User.hasOne(Teacher, { foreignKey: 'userId' });

// Student associations
Student.belongsTo(User, { foreignKey: 'userId' });
Student.belongsToMany(Course, { through: Enrollment, foreignKey: 'studentId' });
Student.hasMany(Submission, { foreignKey: 'studentId' });
Student.hasMany(Attendance, { foreignKey: 'studentId' });
Student.hasMany(Grade, { foreignKey: 'studentId' });

// Teacher associations
Teacher.belongsTo(User, { foreignKey: 'userId' });
Teacher.hasMany(Course, { foreignKey: 'teacherId', as: 'courses' });

// Course associations
Course.belongsTo(Teacher, { foreignKey: 'teacherId', as: 'instructor' });
Course.belongsToMany(Student, { through: Enrollment, foreignKey: 'courseId' });
Course.hasMany(Assignment, { foreignKey: 'courseId' });
Course.hasMany(Attendance, { foreignKey: 'courseId' });
Course.hasMany(Grade, { foreignKey: 'courseId' });
Course.hasMany(Enrollment, { foreignKey: 'courseId' }); // Add this line for explicit Course-Enrollment association

// Enrollment associations
Enrollment.belongsTo(Student, { foreignKey: 'studentId' });
Enrollment.belongsTo(Course, { foreignKey: 'courseId' });

// Assignment associations
Assignment.belongsTo(Course, { foreignKey: 'courseId' });
Assignment.hasMany(Submission, { foreignKey: 'assignmentId' });
Assignment.hasMany(Grade, { foreignKey: 'assignmentId' });

// Submission associations
Submission.belongsTo(Student, { foreignKey: 'studentId' });
Submission.belongsTo(Assignment, { foreignKey: 'assignmentId' });
Submission.hasOne(Grade, { foreignKey: 'submissionId' });

// Attendance associations
Attendance.belongsTo(Student, { foreignKey: 'studentId' });
Attendance.belongsTo(Course, { foreignKey: 'courseId' });

// Grade associations
// Associations already established in Grade.js

module.exports = {
  User,
  Student,
  Teacher,
  Course,
  Enrollment,
  Assignment,
  Submission,
  Attendance,
  Grade
};
