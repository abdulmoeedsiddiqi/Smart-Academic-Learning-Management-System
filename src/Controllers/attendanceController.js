const { Attendance, Student, Course, User, Teacher, Enrollment } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

// @desc    Get all attendance records
// @route   GET /api/attendance
// @access  Private/Admin
const getAttendanceRecords = async (req, res) => {
  try {
    // Get query params for filtering
    const { date, status } = req.query;
    
    // Build filter object
    const filter = {};
    if (date) filter.date = date;
    if (status) filter.status = status;
    
    const attendance = await Attendance.findAll({
      where: filter,
      include: [
        {
          model: Student,
          include: [
            {
              model: User,
              attributes: ['firstName', 'lastName', 'email']
            }
          ]
        },
        {
          model: Course,
          attributes: ['id', 'name', 'courseCode']
        }
      ],
      order: [['date', 'DESC']]
    });

    res.json(attendance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get attendance records by course
// @route   GET /api/attendance/course/:courseId
// @access  Private/Teacher
const getAttendanceByCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const { date, studentId } = req.query;
    
    // Check if course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if teacher is associated with the course
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
      
      if (!teacher || teacher.id !== course.teacherId) {
        return res.status(403).json({ 
          message: 'Not authorized to access attendance records for this course' 
        });
      }
    }
    
    // Build filter object
    const filter = { courseId };
    if (date) filter.date = date;
    if (studentId) filter.studentId = studentId;
    
    // Get attendance records
    const attendance = await Attendance.findAll({
      where: filter,
      include: [
        {
          model: Student,
          include: [
            {
              model: User,
              attributes: ['firstName', 'lastName', 'email']
            }
          ]
        }
      ],
      order: [['date', 'DESC']]
    });

    res.json(attendance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get attendance records by student
// @route   GET /api/attendance/student/:studentId
// @access  Private
const getAttendanceByStudent = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const { courseId, month, status } = req.query;
    
    // Check if student exists
    const student = await Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Check if the user is authorized to view this student's attendance
    if (
      req.user.role !== 'admin' && 
      req.user.role !== 'teacher' && 
      student.userId !== req.user.id
    ) {
      return res.status(403).json({ 
        message: 'Not authorized to access attendance records for this student' 
      });
    }
    
    // Build filter object
    const filter = { studentId };
    if (courseId) filter.courseId = courseId;
    if (status) filter.status = status;
    
    // Filter by month if provided (more complex)
    let dateFilter = {};
    if (month) {
      const year = new Date().getFullYear();
      const monthNumber = parseInt(month) - 1; // JS months are 0-indexed
      
      dateFilter = {
        [Op.and]: [
          sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM "date"')), monthNumber + 1),
          sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('YEAR FROM "date"')), year)
        ]
      };
    }
    
    // Get attendance records
    const attendance = await Attendance.findAll({
      where: { ...filter, ...dateFilter },
      include: [
        {
          model: Course,
          attributes: ['id', 'name', 'courseCode']
        }
      ],
      order: [['date', 'DESC']]
    });

    res.json(attendance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create an attendance record
// @route   POST /api/attendance
// @access  Private/Teacher
const createAttendance = async (req, res) => {
  try {
    const { studentId, courseId, date, status, notes } = req.body;
    
    // Check if student exists
    const student = await Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Check if course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if teacher is associated with the course
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
      
      if (!teacher || teacher.id !== course.teacherId) {
        return res.status(403).json({ 
          message: 'Not authorized to create attendance records for this course' 
        });
      }
    }
    
    // Check if attendance already exists for this date
    const existingAttendance = await Attendance.findOne({
      where: {
        studentId,
        courseId,
        date: new Date(date)
      }
    });
    
    if (existingAttendance) {
      return res.status(400).json({ 
        message: 'Attendance record already exists for this student, course, and date' 
      });
    }
    
    // Create attendance record
    const attendance = await Attendance.create({
      studentId,
      courseId,
      date: new Date(date),
      status,
      notes,
      recordedBy: req.user.id
    });

    res.status(201).json({
      message: 'Attendance record created successfully',
      attendance
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update an attendance record
// @route   PUT /api/attendance/:id
// @access  Private/Teacher
const updateAttendance = async (req, res) => {
  try {
    const attendanceId = req.params.id;
    const { status, notes } = req.body;
    
    // Find the attendance record
    const attendance = await Attendance.findByPk(attendanceId, {
      include: [
        {
          model: Course
        }
      ]
    });
    
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    
    // Check if teacher is associated with the course
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
      
      if (!teacher || teacher.id !== attendance.Course.teacherId) {
        return res.status(403).json({ 
          message: 'Not authorized to update attendance records for this course' 
        });
      }
    }
    
    // Update attendance record
    attendance.status = status || attendance.status;
    attendance.notes = notes || attendance.notes;
    
    await attendance.save();

    res.json({
      message: 'Attendance record updated successfully',
      attendance
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete an attendance record
// @route   DELETE /api/attendance/:id
// @access  Private/Teacher/Admin
const deleteAttendance = async (req, res) => {
  try {
    const attendanceId = req.params.id;
    
    // Find the attendance record
    const attendance = await Attendance.findByPk(attendanceId, {
      include: [
        {
          model: Course
        }
      ]
    });
    
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    
    // Check if teacher is associated with the course
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
      
      if (!teacher || teacher.id !== attendance.Course.teacherId) {
        return res.status(403).json({ 
          message: 'Not authorized to delete attendance records for this course' 
        });
      }
    }
    
    // Delete attendance record
    await attendance.destroy();

    res.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get attendance records for a specific course
// @route   GET /api/teachers/:teacherId/courses/:courseId/attendance
// @access  Private/Teacher
const getAttendanceForCourse = async (req, res) => {
  try {
    const { teacherId, courseId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Date query parameter is required.' });
    }

    // Verify the teacher teaches this course
    const course = await Course.findOne({
      where: { id: courseId, teacherId: teacherId }
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found or not taught by this teacher.' });
    }

    const attendanceRecords = await Attendance.findAll({
      where: {
        courseId: courseId,
        date: date,
      },
      include: [{
        model: Student,
        attributes: ['id', 'studentId'],
        include: [{
          model: User,
          attributes: ['firstName', 'lastName']
        }]
      }],
      order: [
        [{ model: Student }, { model: User }, 'lastName', 'ASC'],
        [{ model: Student }, { model: User }, 'firstName', 'ASC']
      ]
    });

    if (!attendanceRecords || attendanceRecords.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(attendanceRecords);
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ message: 'Server error while fetching attendance records.', error: error.message });
  }
};

// @desc    Get attendance history for a specific course by a teacher
// @route   GET /api/teachers/:teacherId/courses/:courseId/attendance/history
// @access  Private/Teacher
const getAttendanceHistory = async (req, res) => {
  try {
    const { teacherId, courseId } = req.params;
    const { startDate, endDate } = req.query;

    // Ensure the logged-in user is a teacher and get their Teacher profile ID
    const loggedInTeacher = await Teacher.findOne({ where: { userId: req.user.id } });

    if (!loggedInTeacher) {
      return res.status(403).json({ message: 'Forbidden: Teacher profile not found for logged-in user.' });
    }

    // Authorization: Ensure the teacherId in the URL matches the logged-in teacher's profile ID,
    // unless the user is an admin (admin can view any teacher's data).
    if (loggedInTeacher.id.toString() !== teacherId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: You can only access your own attendance history.' });
    }

    // Verify the course exists and belongs to the specified teacher
    const course = await Course.findOne({
      where: {
        id: courseId,
        teacherId: teacherId
      }
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found or not assigned to this teacher.' });
    }

    // Prepare filter for attendance records
    const attendanceFilter = { courseId: courseId };
    if (startDate && endDate) {
      const sDate = new Date(startDate);
      const eDate = new Date(endDate);
      if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date format for startDate or endDate.' });
      }
      attendanceFilter.date = {
        [Op.between]: [sDate, eDate]
      };
    } else if (startDate) {
      const sDate = new Date(startDate);
      if (isNaN(sDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date format for startDate.' });
      }
      attendanceFilter.date = { [Op.gte]: sDate };
    } else if (endDate) {
      const eDate = new Date(endDate);
      if (isNaN(eDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date format for endDate.' });
      }
      attendanceFilter.date = { [Op.lte]: eDate };
    }

    const attendanceRecords = await Attendance.findAll({
      where: attendanceFilter,
      include: [
        {
          model: Student,
          attributes: ['id', 'studentId'], 
          include: [
            {
              model: User,
              attributes: ['firstName', 'lastName', 'email'] 
            }
          ]
        }
      ],
      order: [
        ['date', 'DESC'],
        [Student, User, 'lastName', 'ASC'],
        [Student, User, 'firstName', 'ASC']
      ]
    });

    res.json(attendanceRecords);

  } catch (error) {
    console.error('Error fetching attendance history:', error);
    res.status(500).json({ message: 'Server Error while fetching attendance history.', error: error.message });
  }
};

// @desc    Save attendance records via API for a course on a specific date
// @route   POST /api/teachers/:teacherId/courses/:courseId/record
// @access  Private/Teacher
const recordAttendance = async (req, res) => {
  try {
    const { teacherId, courseId } = req.params; 
    const { date, students } = req.body;

    if (!date || !students || !Array.isArray(students)) {
      return res.status(400).json({ message: 'Missing or invalid date or students data. Ensure students is an array.' });
    }

    let actualLoggedInTeacherId = req.user.teacherId; 
    if (!actualLoggedInTeacherId && req.user && req.user.id) {
      const teacherProfile = await Teacher.findOne({ where: { userId: req.user.id } });
      if (!teacherProfile) {
        return res.status(403).json({ message: 'Teacher profile not found for logged-in user.' });
      }
      actualLoggedInTeacherId = teacherProfile.id.toString();
      req.user.teacherId = actualLoggedInTeacherId; 
    } else if (!actualLoggedInTeacherId) {
        return res.status(401).json({ message: 'User not authenticated or teacher ID not available.' });
    }
    
    if (actualLoggedInTeacherId !== teacherId) {
      return res.status(403).json({ message: 'Access Denied: Teacher ID mismatch.' });
    }

    const course = await Course.findOne({
      where: { 
        id: courseId,
        teacherId: actualLoggedInTeacherId 
      }
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found or not assigned to this teacher.' });
    }

    if (students.length === 0) {
        return res.status(200).json({ message: 'No student attendance data submitted. No changes made.' });
    }

    const attendanceProcessingResults = [];
    for (const studentData of students) {
      // Ensure studentId in the payload is the PK of the Students table (which is `id`)
      // The payload from attendance-form.ejs sends `student.id` as `studentId`
      const { studentId: studentPkValue, status, notes } = studentData; 
      
      if (!studentPkValue || !status) {
        console.warn(`Skipping invalid attendance data for course ${courseId}: studentId (PK) or status missing.`);
        attendanceProcessingResults.push({ studentId: studentPkValue || 'unknown', status: 'error', message: 'Missing studentId (PK) or status.' });
        continue; 
      }

      // Verify student is enrolled in the course using the Student's Primary Key (id)
      const enrollment = await Enrollment.findOne({ where: { courseId: courseId, studentId: studentPkValue } });
      if (!enrollment) {
          console.warn(`Student with PK ${studentPkValue} not enrolled in course ${courseId}. Skipping attendance.`);
          attendanceProcessingResults.push({ studentId: studentPkValue, status: 'skipped', message: 'Student not enrolled in this course.' });
          continue;
      }

      try {
        const [attendance, created] = await Attendance.findOrCreate({
          where: { 
            studentId: studentPkValue, // Use Student's Primary Key from payload
            courseId: courseId,
            date: new Date(date)
          },
          defaults: {
            status,
            notes: notes || '',
            recordedBy: req.user.id 
          }
        });

        if (!created) {
          attendance.status = status;
          attendance.notes = notes || '';
          attendance.recordedBy = req.user.id;
          await attendance.save();
          attendanceProcessingResults.push({ studentId: studentPkValue, status: 'updated' });
        } else {
          attendanceProcessingResults.push({ studentId: studentPkValue, status: 'created' });
        }
      } catch (dbError) {
        console.error(`Error saving attendance for student PK ${studentPkValue} in course ${courseId}:`, dbError);
        attendanceProcessingResults.push({ studentId: studentPkValue, status: 'error', message: 'Database error during save.' });
      }
    }

    const hasErrors = attendanceProcessingResults.some(r => r.status === 'error');
    if (hasErrors) {
        return res.status(207).json({ 
            message: 'Attendance recording completed with some errors.',
            results: attendanceProcessingResults 
        });
    }

    res.status(200).json({ message: 'Attendance recorded successfully.', results: attendanceProcessingResults });

  } catch (error) {
    console.error('API Error recording attendance:', error);
    res.status(500).json({ message: 'An internal server error occurred while recording attendance.' });
  }
};

module.exports = {
  getAttendanceRecords,
  getAttendanceByCourse,
  getAttendanceByStudent,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceForCourse,
  getAttendanceHistory,
  recordAttendance
};
