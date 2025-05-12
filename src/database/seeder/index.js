const { sequelize } = require('../../config/db');
const { User, Student, Teacher, Course, Enrollment, Assignment, Attendance } = require('../../models');
require('dotenv').config();

// Initialize the database with seed data
const seed = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Sync tables (force: true will drop tables first)
    console.log('Syncing database tables...');
    await sequelize.sync({ force: true });
    console.log('Database synchronized!');
    
    // Create admin user
    console.log('Creating admin user...');
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@salams.edu',
      password: 'admin123', // Plain text password - no hashing
      role: 'admin',
      isActive: true
    });
    console.log(`Admin created with email: ${admin.email}`);
    
    // Create teachers
    console.log('Creating teachers...');
    const teacher1 = await User.create({
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@salams.edu',
      password: 'teacher123', // Plain text password - no hashing
      role: 'teacher',
      isActive: true
    });
    
    const teacher2 = await User.create({
      firstName: 'Maria',
      lastName: 'Garcia',
      email: 'maria.garcia@salams.edu',
      password: 'teacher123', // Plain text password - no hashing
      role: 'teacher',
      isActive: true
    });
    
    // Create teacher profiles
    const teacherProfile1 = await Teacher.create({
      userId: teacher1.id,
      teacherId: 'TCH001',
      department: 'Computer Science',
      hireDate: new Date(),
      qualification: 'Ph.D. in Computer Science',
      specialization: 'Artificial Intelligence',
      experience: 8,
      bio: 'Experienced professor with expertise in AI and machine learning.'
    });
    
    const teacherProfile2 = await Teacher.create({
      userId: teacher2.id,
      teacherId: 'TCH002',
      department: 'Mathematics',
      hireDate: new Date(),
      qualification: 'Ph.D. in Applied Mathematics',
      specialization: 'Data Science',
      experience: 6,
      bio: 'Specializes in statistical analysis and data visualization.'
    });
    
    console.log(`Created ${2} teachers`);
    
    // Create students
    console.log('Creating students...');
    
    const studentUsers = [];
    const studentProfiles = [];
    
    for (let i = 1; i <= 10; i++) {
      const student = await User.create({
        firstName: `Student${i}`,
        lastName: `Lastname${i}`,
        email: `student${i}@salams.edu`,
        password: 'student123', // Plain text password - no hashing
        role: 'student',
        isActive: true
      });
      
      studentUsers.push(student);
      
      const studentProfile = await Student.create({
        userId: student.id,
        studentId: `STU00${i}`,
        grade: Math.floor(Math.random() * 4) + 9, // Random grade between 9-12
        section: ['A', 'B', 'C'][Math.floor(Math.random() * 3)], // Random section
        enrollmentDate: new Date()
      });
      
      studentProfiles.push(studentProfile);
    }
    
    console.log(`Created ${studentUsers.length} students`);

    // Create courses
    console.log('Creating courses...');
    const courses = [
      {
        name: 'Introduction to Computer Science',
        courseCode: 'CS101',
        description: 'Fundamental concepts of computer science and programming',
        credits: 3,
        teacherId: teacherProfile1.id
      },
      {
        name: 'Data Structures and Algorithms',
        courseCode: 'CS201',
        description: 'Study of common data structures and algorithms',
        credits: 4,
        teacherId: teacherProfile1.id
      },
      {
        name: 'Applied Statistics',
        courseCode: 'MATH301',
        description: 'Statistical methods and their applications',
        credits: 3,
        teacherId: teacherProfile2.id
      },
      {
        name: 'Calculus I',
        courseCode: 'MATH101',
        description: 'Introduction to differential and integral calculus',
        credits: 4,
        teacherId: teacherProfile2.id
      }
    ];
    
    const createdCourses = [];
    for (const course of courses) {
      const createdCourse = await Course.create(course);
      createdCourses.push(createdCourse);
    }
    
    console.log(`Created ${createdCourses.length} courses`);
    
    // Enroll students in courses
    console.log('Enrolling students in courses...');
    let enrollmentCount = 0;
    
    for (const student of studentProfiles) {
      // Enroll each student in 2-3 random courses
      const numCourses = Math.floor(Math.random() * 2) + 2; // 2-3 courses
      const shuffledCourses = [...createdCourses].sort(() => 0.5 - Math.random());
      const coursesToEnroll = shuffledCourses.slice(0, numCourses);
      
      for (const course of coursesToEnroll) {
        await Enrollment.create({
          studentId: student.id,
          courseId: course.id,
          enrollmentDate: new Date(),
          status: 'active'
        });
        enrollmentCount++;
      }
    }
    
    console.log(`Created ${enrollmentCount} enrollments`);
    
    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
  }
};

// Execute the seed function when this file is run directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log('Seeding completed. Exiting process.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error during seeding:', err);
      process.exit(1);
    });
}

module.exports = seed;
