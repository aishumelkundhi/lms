import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './MyCourses.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function MyCourses() {
  const { getAuthHeaders } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyCourses();
  }, []);

  const fetchMyCourses = async () => {
    try {
      const response = await axios.get(`${API_URL}/enrollments/my-courses`, {
        headers: getAuthHeaders()
      });
      setCourses(response.data.courses);
    } catch (err) {
      setError('Failed to load your courses');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading your courses...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="my-courses-container">
      <div className="my-courses-header">
        <h1>My Courses</h1>
        <p>Continue your learning journey</p>
      </div>

      {courses.length === 0 ? (
        <div className="no-courses">
          <div className="no-courses-icon">📚</div>
          <h2>No courses yet</h2>
          <p>You haven't enrolled in any courses yet.</p>
          <Link to="/courses" className="btn-browse">
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="my-courses-grid">
          {courses.map(course => (
            <div key={course.id} className="my-course-card">
              <div className="my-course-thumbnail">
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
              
              <div className="my-course-content">
                <h3>{course.title}</h3>
                <p className="instructor">by {course.instructor_name}</p>
                
                <div className="progress-section">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${course.progress_percentage || 0}%` }}
                    />
                  </div>
                  <div className="progress-info">
                    <span>{course.progress_percentage || 0}% complete</span>
                    <span>{course.completed_lessons || 0}/{course.total_lessons || 0} lessons</span>
                  </div>
                </div>

                <Link 
                  to={`/learn/${course.id}`} 
                  className="btn-continue"
                >
                  {course.progress_percentage > 0 ? 'Continue Learning' : 'Start Learning'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyCourses;
