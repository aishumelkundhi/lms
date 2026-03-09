const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use in-memory database for serverless/Vercel deployment
// For local development with persistence, use file-based database
const isProduction = process.env.NODE_ENV === 'production';
const dbPath = isProduction ? ':memory:' : path.join(__dirname, '..', 'lms.db');
const db = new sqlite3.Database(dbPath);

let initialized = false;

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    if (initialized) {
      resolve();
      return;
    }

    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT CHECK(role IN ('student', 'instructor', 'admin')) DEFAULT 'student',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Courses table
      db.run(`
        CREATE TABLE IF NOT EXISTS courses (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          thumbnail_url TEXT,
          category TEXT,
          instructor_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (instructor_id) REFERENCES users(id)
        )
      `);

      // Sections table
      db.run(`
        CREATE TABLE IF NOT EXISTS sections (
          id TEXT PRIMARY KEY,
          course_id TEXT NOT NULL,
          title TEXT NOT NULL,
          section_order INTEGER NOT NULL,
          FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
        )
      `);

      // Lessons table
      db.run(`
        CREATE TABLE IF NOT EXISTS lessons (
          id TEXT PRIMARY KEY,
          section_id TEXT NOT NULL,
          title TEXT NOT NULL,
          lesson_order INTEGER NOT NULL,
          youtube_url TEXT NOT NULL,
          duration TEXT,
          FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
        )
      `);

      // Enrollments table
      db.run(`
        CREATE TABLE IF NOT EXISTS enrollments (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          course_id TEXT NOT NULL,
          enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
          UNIQUE(user_id, course_id)
        )
      `);

      // Progress table
      db.run(`
        CREATE TABLE IF NOT EXISTS progress (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          course_id TEXT NOT NULL,
          lesson_id TEXT NOT NULL,
          status TEXT CHECK(status IN ('not_started', 'in_progress', 'completed')) DEFAULT 'not_started',
          last_watched_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
          FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
          UNIQUE(user_id, lesson_id)
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          initialized = true;
          resolve();
        }
      });
    });
  });
}

async function seedDatabase() {
  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');

  try {
    // Check if users already exist
    const userCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    if (userCount > 0) {
      console.log('Database already seeded');
      return;
    }

    console.log('Seeding database...');

    // Create sample users
    const adminId = uuidv4();
    const instructor1Id = uuidv4();
    const instructor2Id = uuidv4();
    const studentId = uuidv4();

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Insert users
    const users = [
      [adminId, 'admin@lms.com', hashedPassword, 'Admin User', 'admin'],
      [instructor1Id, 'john@lms.com', hashedPassword, 'John Smith', 'instructor'],
      [instructor2Id, 'jane@lms.com', hashedPassword, 'Jane Doe', 'instructor'],
      [studentId, 'student@lms.com', hashedPassword, 'Student User', 'student']
    ];

    for (const user of users) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT OR IGNORE INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)',
          user,
          (err) => err ? reject(err) : resolve()
        );
      });
    }

    console.log('Users created');

    // Create sample courses
    const course1Id = uuidv4();
    const course2Id = uuidv4();
    const course3Id = uuidv4();

    const courses = [
      [course1Id, 'Complete Web Development Bootcamp', 'Learn HTML, CSS, JavaScript, React, Node.js and more in this comprehensive course.', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800', 'Development', instructor1Id],
      [course2Id, 'Python for Data Science', 'Master Python programming and learn data analysis, visualization, and machine learning.', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800', 'Data Science', instructor2Id],
      [course3Id, 'UI/UX Design Fundamentals', 'Learn the principles of user interface and user experience design with practical projects.', 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800', 'Design', instructor1Id]
    ];

    for (const course of courses) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT OR IGNORE INTO courses (id, title, description, thumbnail_url, category, instructor_id) VALUES (?, ?, ?, ?, ?, ?)',
          course,
          (err) => err ? reject(err) : resolve()
        );
      });
    }

    console.log('Courses created');

    // Create sections for course 1
    const section1Id = uuidv4();
    const section2Id = uuidv4();
    const section3Id = uuidv4();

    const sections = [
      [section1Id, course1Id, 'HTML & CSS Basics', 1],
      [section2Id, course1Id, 'JavaScript Fundamentals', 2],
      [section3Id, course1Id, 'React Framework', 3]
    ];

    for (const section of sections) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT OR IGNORE INTO sections (id, course_id, title, section_order) VALUES (?, ?, ?, ?)',
          section,
          (err) => err ? reject(err) : resolve()
        );
      });
    }

    console.log('Sections created');

    // Create lessons for sections
    const lessons = [
      // Section 1: HTML & CSS
      [uuidv4(), section1Id, 'Introduction to HTML', 1, 'https://www.youtube.com/embed/qz0aGYrrlhU', '15:30'],
      [uuidv4(), section1Id, 'HTML Document Structure', 2, 'https://www.youtube.com/embed/UB1O30fR-EE', '12:45'],
      [uuidv4(), section1Id, 'CSS Basics and Selectors', 3, 'https://www.youtube.com/embed/yfoY53QXEnI', '18:20'],
      [uuidv4(), section1Id, 'CSS Box Model', 4, 'https://www.youtube.com/embed/rIO5326FgPE', '14:15'],
      
      // Section 2: JavaScript
      [uuidv4(), section2Id, 'JavaScript Introduction', 1, 'https://www.youtube.com/embed/W6NZfCO5SIk', '20:00'],
      [uuidv4(), section2Id, 'Variables and Data Types', 2, 'https://www.youtube.com/embed/9emXNzqCKyg', '16:30'],
      [uuidv4(), section2Id, 'Functions and Scope', 3, 'https://www.youtube.com/embed/N8ap4k_1QEQ', '22:15'],
      
      // Section 3: React
      [uuidv4(), section3Id, 'React Introduction', 1, 'https://www.youtube.com/embed/w7ejDZ8SWv8', '25:00'],
      [uuidv4(), section3Id, 'Components and Props', 2, 'https://www.youtube.com/embed/9hb_0TZ_Mcg', '19:45']
    ];

    for (const lesson of lessons) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT OR IGNORE INTO lessons (id, section_id, title, lesson_order, youtube_url, duration) VALUES (?, ?, ?, ?, ?, ?)',
          lesson,
          (err) => err ? reject(err) : resolve()
        );
      });
    }

    console.log('Lessons created');
    console.log('Seeding completed!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

module.exports = { db, initializeDatabase, seedDatabase };
