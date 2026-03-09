import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './CourseDetail.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, getAuthHeaders } = useAuth();
  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    fetchCourse();
    if (user) {
      checkEnrollment();
    }
  }, [id, user]);

  const fetchCourse = async () => {
    try {
      const response = await axios.get(`${API_URL}/courses/${id}`);
      setCourse(response.data.course);
      setSections(response.data.sections);
    } catch (err) {
      setError('Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollment = async () => {
    try {
      const response = await axios.get(`${API_URL}/enrollments/check/${id}`, {
        headers: getAuthHeaders()
      });
      setIsEnrolled(response.data.enrolled);
    } catch (err) {
      console.error('Error checking enrollment:', err);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setEnrolling(true);
    try {
      await axios.post(`${API_URL}/enrollments`, 
        { course_id: id },
        { headers: getAuthHeaders() }
      );
      setIsEnrolled(true);
      // Navigate to learning page
      navigate(`/learn/${id}`);
    } catch (err) {
      if (err.response?.status === 409) {
        setIsEnrolled(true);
        navigate(`/learn/${id}`);
      } else {
        setError('Failed to enroll in course');
      }
    } finally {
      setEnrolling(false);
    }
  };

  const handleContinueLearning = () => {
    navigate(`/learn/${id}`);
  };

  if (loading) return <div className="loading">Loading course details...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!course) return <div className="error">Course not found</div>;

  const totalLessons = sections.reduce((acc, section) => acc + (section.lessons?.length || 0), 0);

  return (
    <div className="course-detail-container">
      <div className="course-hero">
        <div className="course-hero-content">
          {course.category && (
            <span className="course-category-badge">{course.category}</span>
          )}
          <h1>{course.title}</h1>
          <p className="course-instructor">
            Instructor: <strong>{course.instructor_name}</strong>
          </p>
          <p className="course-description">{course.description}</p>
          
          <div className="course-stats">
            <span>📚 {sections.length} Sections</span>
            <span>🎥 {totalLessons} Lessons</span>
          </div>

          {isEnrolled ? (
            <button 
              className="btn-continue"
              onClick={handleContinueLearning}
            >
              Continue Learning
            </button>
          ) : (
            <button 
              className="btn-enroll"
              onClick={handleEnroll}
              disabled={enrolling}
            >
              {enrolling ? 'Enrolling...' : 'Enroll Now'}
            </button>
          )}
        </div>
        
        <div className="course-hero-image">
          <img 
            src={course.thumbnail_url || 'https://via.placeholder.com/600x340?text=Course'} 
            alt={course.title}
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/600x340?text=Course';
            }}
          />
        </div>
      </div>

      <div className="course-curriculum">
        <h2>Course Curriculum</h2>
        
        {sections.length === 0 ? (
          <p className="no-content">No content available yet.</p>
        ) : (
          <div className="sections-list">
            {sections.map((section, sectionIndex) => (
              <div key={section.id} className="section-card">
                <div className="section-header">
                  <h3>
                    <span className="section-number">Section {sectionIndex + 1}</span>
                    {section.title}
                  </h3>
                  <span className="lesson-count">
                    {section.lessons?.length || 0} lessons
                  </span>
                </div>
                
                {section.lessons && section.lessons.length > 0 && (
                  <ul className="lessons-list">
                    {section.lessons.map((lesson, lessonIndex) => (
                      <li key={lesson.id} className="lesson-item">
                        <span className="lesson-number">{lessonIndex + 1}</span>
                        <span className="lesson-title">{lesson.title}</span>
                        {lesson.duration && (
                          <span className="lesson-duration">{lesson.duration}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CourseDetail;
