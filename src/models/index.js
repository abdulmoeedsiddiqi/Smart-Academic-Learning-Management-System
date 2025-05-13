const User = require('./User');
const Teacher = require('./Teacher');
const Student = require('./Student');
const Course = require('./Course');
const Assignment = require('./Assignment');
const Submission = require('./Submission');
const Grade = require('./Grade');
const Attendance = require('./Attendance');
const Enrollment = require('./Enrollment');

// Define associations
User.hasOne(Teacher, { foreignKey: 'userId' });
Teacher.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(Student, { foreignKey: 'userId' });
Student.belongsTo(User, { foreignKey: 'userId' });

Teacher.hasMany(Course, { foreignKey: 'teacherId' });
Course.belongsTo(Teacher, { as: 'courseTeacher', foreignKey: 'teacherId' });

Course.hasMany(Assignment, { foreignKey: 'courseId' });
Assignment.belongsTo(Course, { foreignKey: 'courseId' });

Student.hasMany(Submission, { foreignKey: 'studentId' });
Submission.belongsTo(Student, { foreignKey: 'studentId' });

Assignment.hasMany(Submission, { foreignKey: 'assignmentId' });
Submission.belongsTo(Assignment, { foreignKey: 'assignmentId' });

// Grade associations
Grade.belongsTo(Assignment, { foreignKey: 'assignmentId', as: 'GradedAssignment' });
Assignment.hasMany(Grade, { foreignKey: 'assignmentId', as: 'AssignmentGrades' }); // Added reciprocal association

// Explicit associations for Course-Enrollment and Student-Enrollment
Student.belongsToMany(Course, { through: Enrollment, foreignKey: 'studentId' });
Course.belongsToMany(Student, { through: Enrollment, foreignKey: 'courseId' });
Course.hasMany(Enrollment, { foreignKey: 'courseId' });
Enrollment.belongsTo(Course, { foreignKey: 'courseId' });
Student.hasMany(Enrollment, { foreignKey: 'studentId' });
Enrollment.belongsTo(Student, { foreignKey: 'studentId' });

// Attendance associations
Course.hasMany(Attendance, { foreignKey: 'courseId' });
Attendance.belongsTo(Course, { foreignKey: 'courseId' });
Student.hasMany(Attendance, { foreignKey: 'studentId' });
Attendance.belongsTo(Student, { foreignKey: 'studentId' });

// Export models
module.exports = {
  User,
  Teacher,
  Student,
  Course,
  Assignment,
  Submission,
  Grade,
  Attendance,
  Enrollment
};