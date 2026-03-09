import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './Learning.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function Learning() {
  const { courseId, lessonId: urlLessonId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getAuthHeaders } = useAuth();
  
  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [progress, setProgress] = useState({});
  const [progressSummary, setProgressSummary] = useState({
    total_lessons: 0,
    completed_lessons: 0,
    progress_percentage: 0,
    last_watched_lesson_id: null
  });
  const [navigation, setNavigation] = useState({ previous: null, next: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Fetch course data
  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  // Fetch progress data
  useEffect(() => {
    if (courseId) {
      fetchProgress();
    }
  }, [courseId]);

  // Set current lesson based on URL or last watched
  useEffect(() => {
    if (sections.length > 0 && !loading) {
      const allLessons = sections.flatMap(s => s.lessons || []);
      
      if (urlLessonId) {
        const lesson = allLessons.find(l => l.id === urlLessonId);
        if (lesson) {
          setCurrentLesson(lesson);
        }
      } else if (progressSummary.last_watched_lesson_id) {
        const lesson = allLessons.find(l => l.id === progressSummary.last_watched_lesson_id);
        if (lesson) {
          setCurrentLesson(lesson);
          // Update URL without navigation
          navigate(`/learn/${courseId}/lesson/${lesson.id}`, { replace: true });
        }
      } else if (allLessons.length > 0) {
        setCurrentLesson(allLessons[0]);
        navigate(`/learn/${courseId}/lesson/${allLessons[0].id}`, { replace: true });
      }
    }
  }, [sections, urlLessonId, progressSummary.last_watched_lesson_id, loading]);

  // Update navigation when current lesson changes
  useEffect(() => {
    if (currentLesson && courseId) {
      fetchNavigation();
      updateLessonProgress('in_progress');
    }
  }, [currentLesson?.id]);

  const fetchCourseData = async () => {
    try {
      const response = await axios.get(`${API_URL}/courses/${courseId}`);
      setCourse(response.data.course);
      setSections(response.data.sections);
    } catch (err) {
      setError('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const response = await axios.get(`${API_URL}/progress/course/${courseId}`, {
        headers: getAuthHeaders()
      });
      
      const progressMap = {};
      response.data.progress.forEach(p => {
        progressMap[p.lesson_id] = p;
      });
      
      setProgress(progressMap);
      setProgressSummary(response.data.summary);
    } catch (err) {
      console.error('Error fetching progress:', err);
    }
  };

  const fetchNavigation = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/progress/navigation/${courseId}/${currentLesson.id}`,
        { headers: getAuthHeaders() }
      );
      setNavigation({
        previous: response.data.previous,
        next: response.data.next
      });
    } catch (err) {
      console.error('Error fetching navigation:', err);
    }
  };

  const updateLessonProgress = async (status) => {
    try {
      await axios.post(
        `${API_URL}/progress/lesson/${currentLesson.id}`,
        { status },
        { headers: getAuthHeaders() }
      );
      
      // Update local progress state
      setProgress(prev => ({
        ...prev,
        [currentLesson.id]: { ...prev[currentLesson.id], status }
      }));
      
      // Refresh progress summary
      fetchProgress();
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  const handleMarkComplete = async () => {
    try {
      await axios.post(
        `${API_URL}/progress/lesson/${currentLesson.id}/complete`,
        {},
        { headers: getAuthHeaders() }
      );
      
      setProgress(prev => ({
        ...prev,
        [currentLesson.id]: { ...prev[currentLesson.id], status: 'completed' }
      }));
      
      fetchProgress();
      
      // Auto-advance to next lesson if available
      if (navigation.next) {
        handleLessonSelect(navigation.next);
      }
    } catch (err) {
      console.error('Error marking complete:', err);
    }
  };

  const handleLessonSelect = (lesson) => {
    setCurrentLesson(lesson);
    navigate(`/learn/${courseId}/lesson/${lesson.id}`);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handlePrevious = () => {
    if (navigation.previous) {
      handleLessonSelect(navigation.previous);
    }
  };

  const handleNext = () => {
    if (navigation.next) {
      handleLessonSelect(navigation.next);
    }
  };

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return '';
    // Handle various YouTube URL formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    return url;
  };

  const getLessonStatus = (lessonId) => {
    const lessonProgress = progress[lessonId];
    if (!lessonProgress) return 'not_started';
    return lessonProgress.status;
  };

  if (loading) return <div className="loading">Loading course...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!course) return <div className="error">Course not found</div>;

  return (
    <div className="learning-container">
      {/* Progress Bar */}
      <div className="progress-bar-container">
        <div className="progress-info">
          <span className="course-title">{course.title}</span>
          <span className="progress-text">
            {progressSummary.completed_lessons} / {progressSummary.total_lessons} lessons completed
          </span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${progressSummary.progress_percentage}%` }}
          />
        </div>
        <span className="progress-percentage">{progressSummary.progress_percentage}%</span>
      </div>

      <div className="learning-content">
        {/* Sidebar */}
        <aside className={`lesson-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <h3>Course Content</h3>
            <button 
              className="toggle-sidebar"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? '✕' : '☰'}
            </button>
          </div>
          
          <div className="sections-list">
            {sections.map((section, sectionIndex) => (
              <div key={section.id} className="sidebar-section">
                <div className="sidebar-section-title">
                  <span className="section-num">{sectionIndex + 1}</span>
                  {section.title}
                </div>
                
                {section.lessons && (
                  <ul className="sidebar-lessons">
                    {section.lessons.map((lesson, lessonIndex) => {
                      const status = getLessonStatus(lesson.id);
                      const isActive = currentLesson?.id === lesson.id;
                      
                      return (
                        <li 
                          key={lesson.id}
                          className={`sidebar-lesson ${isActive ? 'active' : ''} ${status}`}
                          onClick={() => handleLessonSelect(lesson)}
                        >
                          <span className="lesson-status-icon">
                            {status === 'completed' ? '✓' : 
                             status === 'in_progress' ? '▶' : '○'}
                          </span>
                          <span className="lesson-info">
                            <span className="lesson-title">{lesson.title}</span>
                            {lesson.duration && (
                              <span className="lesson-duration">{lesson.duration}</span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="lesson-main">
          {!sidebarOpen && (
            <button 
              className="open-sidebar-btn"
              onClick={() => setSidebarOpen(true)}
            >
              ☰ Course Content
            </button>
          )}

          {currentLesson ? (
            <>
              <div className="video-container">
                <iframe
                  src={getYouTubeEmbedUrl(currentLesson.youtube_url)}
                  title={currentLesson.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <div className="lesson-info-panel">
                <h1>{currentLesson.title}</h1>
                
                <div className="lesson-actions">
                  <button 
                    className="btn-nav"
                    onClick={handlePrevious}
                    disabled={!navigation.previous}
                  >
                    ← Previous
                  </button>
                  
                  <button 
                    className="btn-complete"
                    onClick={handleMarkComplete}
                    disabled={getLessonStatus(currentLesson.id) === 'completed'}
                  >
                    {getLessonStatus(currentLesson.id) === 'completed' 
                      ? '✓ Completed' 
                      : 'Mark as Complete'}
                  </button>
                  
                  <button 
                    className="btn-nav"
                    onClick={handleNext}
                    disabled={!navigation.next}
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="no-lesson">
              <p>No lesson selected</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Learning;
