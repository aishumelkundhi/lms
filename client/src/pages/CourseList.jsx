import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './CourseList.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function CourseList() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await axios.get(`${API_URL}/courses`);
      setCourses(response.data.courses);
    } catch (err) {
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...new Set(courses.map(c => c.category).filter(Boolean))];

  const filteredCourses = selectedCategory === 'All' 
    ? courses 
    : courses.filter(c => c.category === selectedCategory);

  if (loading) return <div className="loading">Loading courses...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="course-list-container">
      <div className="course-list-header">
        <h1>Explore Courses</h1>
        <p>Discover new skills and advance your career</p>
      </div>

      <div className="category-filter">
        {categories.map(category => (
          <button
            key={category}
            className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="courses-grid">
        {filteredCourses.map(course => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <div className="no-courses">
          <p>No courses found in this category.</p>
        </div>
      )}
    </div>
  );
}

function CourseCard({ course }) {
  return (
    <div className="course-card">
      <div className="course-thumbnail">
        <img 
          src={course.thumbnail_url || 'https://via.placeholder.com/400x225?text=Course'} 
          alt={course.title}
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/400x225?text=Course';
          }}
        />
        {course.category && (
          <span className="course-category">{course.category}</span>
        )}
      </div>
      
      <div className="course-content">
        <h3 className="course-title">{course.title}</h3>
        <p className="course-description">{course.description}</p>
        
        <div className="course-meta">
          <span className="instructor">👤 {course.instructor_name}</span>
          <span className="lessons-count">
            📚 {course.lesson_count || 0} lessons
          </span>
        </div>

        <Link to={`/courses/${course.id}`} className="btn-view-course">
          View Course
        </Link>
      </div>
    </div>
  );
}

export default CourseList;
