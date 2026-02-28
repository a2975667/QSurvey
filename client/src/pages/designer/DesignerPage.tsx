import React, { useCallback, useEffect, useState } from 'react';
import './designer.css';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { API_PREFIX } from '../../config';
import { loginSuccess, logout } from '../../features/authSlice';
import { fetchProtected } from '../../lib/protectedFetch';
import AppShell from '../../layout/AppShell';
import UserMenu from '../../layout/UserMenu';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { filterAndSortProjects, ProjectsSortMode } from './projectsSearchSort';
import { FiCopy } from 'react-icons/fi';

interface Survey {
  _id: string;
  title: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SurveyFormData {
  title: string;
  description: string;
  settings: {
    hasSKey: boolean;
    sKeyValue: string;
    hasUKey: boolean;
    isAvailable: boolean;
  }
}

const DesignerPage: React.FC = () => {
  useDocumentTitle('Projects – QSurvey System');
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<ProjectsSortMode>('updated_desc');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [cloneSurveyId, setCloneSurveyId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SurveyFormData>({
    title: '',
    description: '',
    settings: {
      hasSKey: false,
      sKeyValue: '',
      hasUKey: false,
      isAvailable: true
    }
  });
  const [error, setError] = useState<string | null>(null);
  
  const auth = useAppSelector(state => state.auth);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleProtectedAuthFailure = useCallback(() => {
    setSurveys([]);
    dispatch(logout());
    navigate('/login');
  }, [dispatch, navigate]);

  useEffect(() => {
    // Only fetch if authenticated
    if (auth.isAuthenticated && auth.token) {
      fetchUserSurveys();
    }
  }, [auth.isAuthenticated, auth.token]);

  const fetchUserSurveys = async () => {
    try {
      setLoading(true);
      const response = await fetchProtected(`${API_PREFIX}/protected/surveys`, {}, {
        token: auth.token,
        onTokenRefresh: (token) => dispatch(loginSuccess({ token })),
        onAuthFailure: () => handleProtectedAuthFailure(),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSurveys(data);
      } else {
        if (response.status === 401 || response.status === 403) {
          return;
        }
        console.error('Failed to fetch surveys');
      }
    } catch (error) {
      console.error('Error fetching surveys:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToSurvey = (surveyId: string) => {
    navigate(`/survey/${surveyId}`);
  };

  const handleCloneSurvey = async (surveyId: string) => {
    try {
      setCloneSurveyId(surveyId);
      const response = await fetchProtected(`${API_PREFIX}/protected/surveys/${surveyId}/clone`, {
        method: 'POST',
      }, {
        token: auth.token,
        onTokenRefresh: (token) => dispatch(loginSuccess({ token })),
        onAuthFailure: () => handleProtectedAuthFailure(),
      });

      if (response.ok) {
        const clonedSurvey = await response.json();
        navigate(`/survey/${clonedSurvey._id}/edit`);
        return;
      }

      if (response.status === 401 || response.status === 403) {
        return;
      }

      console.error('Failed to clone survey');
    } catch (cloneError) {
      console.error('Error cloning survey:', cloneError);
    } finally {
      setCloneSurveyId(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      settings: {
        ...formData.settings,
        [name]: type === 'checkbox' ? checked : value
      }
    });
  };

  const handleCreateSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Title and description are required');
      return;
    }
    
    if (formData.settings.hasSKey && !formData.settings.sKeyValue.trim()) {
      setError('Survey key value is required when "Has Survey Key" is enabled');
      return;
    }
    
    try {
      setCreateLoading(true);
      setError(null);
      
      const response = await fetchProtected(`${API_PREFIX}/protected/surveys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      }, {
        token: auth.token,
        onTokenRefresh: (token) => dispatch(loginSuccess({ token })),
        onAuthFailure: () => handleProtectedAuthFailure(),
      });
      
      if (response.ok) {
        const newSurvey = await response.json();
        fetchUserSurveys(); // Refresh the list
        setShowCreateForm(false);
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          settings: {
            hasSKey: false,
            sKeyValue: '',
            hasUKey: false,
            isAvailable: true
          }
        });
        
        // Navigate to the edit page to add questions
        navigate(`/survey/${newSurvey._id}/edit`);
      } else {
        if (response.status === 401 || response.status === 403) {
          return;
        }
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create survey');
      }
    } catch (error) {
      console.error('Error creating survey:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  useEffect(() => {
    if (!sortMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSortMenuOpen(false);
    };
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const withinMenu = target.closest?.('.projects-sort') != null;
      if (!withinMenu) setSortMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [sortMenuOpen]);

  const sortLabelByMode: Record<ProjectsSortMode, string> = {
    default: 'Newest first',
    created_desc: 'Newest first',
    created_asc: 'Oldest first',
    updated_desc: 'Recently updated',
    updated_asc: 'Least recently updated',
  };

  const sortMenuOptions: Array<{ mode: ProjectsSortMode; label: string }> = [
    { mode: 'created_desc', label: 'Newest first' },
    { mode: 'created_asc', label: 'Oldest first' },
    { mode: 'updated_desc', label: 'Recently updated' },
    { mode: 'updated_asc', label: 'Least recently updated' },
  ];

  const visibleSurveys = filterAndSortProjects(surveys, { query: searchQuery, sortMode });
  const isLoadingInitialList = loading && surveys.length === 0;

  return (
    <AppShell
      appBarProps={{
        title: 'QSurvey System',
        breadcrumbs: [
          { label: 'Projects', onClick: () => navigate('/designer') },
        ],
        onTitleClick: () => navigate('/'),
        actions: auth.isAuthenticated ? (
          <UserMenu email={auth.user?.email} onLogout={handleLogout} />
        ) : undefined,
      }}
    >
      <div className="designer-container">
        <div className="designer-content">
          <div className="projects-header">
            {loading || surveys.length > 0 ? (
              <div className="projects-controls">
                <div className="projects-search-group">
                  <label htmlFor="projects-search" className="projects-control-label">
                    Search
                  </label>
                  <input
                    id="projects-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Title or description…"
                    aria-label="Search projects"
                  />
                </div>

                <div className="projects-controls-actions">
                  <div className="projects-sort">
                    <span className="projects-control-label">Sort by</span>
                    <button
                      type="button"
                      className="projects-sort-button"
                      aria-haspopup="menu"
                      aria-expanded={sortMenuOpen}
                      disabled={isLoadingInitialList}
                      onClick={() => setSortMenuOpen((v) => !v)}
                    >
                      {sortLabelByMode[sortMode]}
                    </button>
                    {sortMenuOpen && (
                      <div className="projects-sort-menu" role="menu" aria-label="Sort options">
                        {sortMenuOptions.map((option) => (
                          <button
                            key={option.mode}
                            type="button"
                            role="menuitemradio"
                            aria-checked={sortMode === option.mode}
                            className={`projects-sort-item ${sortMode === option.mode ? 'active' : ''}`}
                            onClick={() => {
                              setSortMode(option.mode);
                              setSortMenuOpen(false);
                            }}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {isLoadingInitialList ? (
                    <button disabled title="Loading projects..." className="create-survey-btn">
                      + Create Project
                    </button>
                  ) : surveys.length < 50 ? (
                    <button onClick={() => setShowCreateForm(!showCreateForm)} className="create-survey-btn">
                      {showCreateForm ? '✕ Cancel' : '+ Create Project'}
                    </button>
                  ) : (
                    <button disabled title="Max surveys reached (50)" className="create-survey-btn">
                      Limit Reached
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <button onClick={() => setShowCreateForm(!showCreateForm)} className="create-survey-btn">
                {showCreateForm ? '✕ Cancel' : '+ Create Project'}
              </button>
            )}
          </div>
        
        {showCreateForm && !loading && surveys.length < 50 && (
          <div className="create-survey-form">
            <h3>Create New Quadratic Survey Project</h3>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleCreateSurvey}>
              <div className="form-group">
                <label htmlFor="title">Title:</label>
                <input 
                  type="text" 
                  id="title" 
                  name="title" 
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter survey title"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description:</label>
                <textarea 
                  id="description" 
                  name="description" 
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter survey description"
                  required
                />
              </div>
              
              <div className="form-group checkbox-group">
                {/* <div className="checkbox-item">
                  <input 
                    type="checkbox" 
                    id="hasSKey" 
                    name="hasSKey" 
                    checked={formData.settings.hasSKey}
                    onChange={handleSettingsChange}
                  />
                  <label htmlFor="hasSKey">Has Survey Key</label>
                </div> */}
                {/* {formData.settings.hasSKey && (
                  <div className="form-group">
                    <label htmlFor="sKeyValue">Survey Key Value:</label>
                    <input 
                      type="text" 
                      id="sKeyValue" 
                      name="sKeyValue" 
                      value={formData.settings.sKeyValue}
                      onChange={handleSettingsChange}
                      placeholder="Enter survey key value"
                    />
                  </div>
                )} */}
                {/* <div className="checkbox-item">
                  <input 
                    type="checkbox" 
                    id="hasUKey" 
                    name="hasUKey" 
                    checked={formData.settings.hasUKey}
                    onChange={handleSettingsChange}
                  />
                  <label htmlFor="hasUKey">Has User Key</label>
                </div> */}
                <div className="checkbox-item">
                  <input 
                    type="checkbox" 
                    id="isAvailable" 
                    name="isAvailable" 
                    checked={formData.settings.isAvailable}
                    onChange={handleSettingsChange}
                  />
                  <label htmlFor="isAvailable">Is Available</label>
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={createLoading}
                >
                  {createLoading ? 'Creating...' : 'Create QS Project'}
                </button>
              </div>
            </form>
          </div>
        )}
        
        {loading ? (
          <p>Loading your surveys...</p>
        ) : surveys.length > 0 ? (
          visibleSurveys.length > 0 ? (
            <div className="surveys-list">
              {visibleSurveys.map((survey) => (
                <div key={survey._id} className="survey-item">
                  <button
                    className="clone-survey-icon-btn"
                    onClick={() => handleCloneSurvey(survey._id)}
                    disabled={cloneSurveyId === survey._id}
                    aria-label="Clone survey"
                    title="Clone survey"
                  >
                    <FiCopy aria-hidden="true" />
                  </button>
                  <h3>{survey.title}</h3>
                  <p>{survey.description}</p>
                  <span className="survey-date">ID: {survey._id}</span>
                  <div className="survey-actions">
                    <button className="view-survey-btn" onClick={() => goToSurvey(survey._id)}>
                      View Survey
                    </button>
                    <button className="edit-survey-btn" onClick={() => navigate(`/survey/${survey._id}/edit`)}>
                      Edit Survey
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-projects-match">
              <p>No projects match your search.</p>
            </div>
          )
        ) : (
          <div className="no-surveys">
            <p>You don't have any QS projects yet. Create one to get started!</p>
            {!showCreateForm && (
              <button 
                className="create-first-survey-btn"
                onClick={() => setShowCreateForm(true)}
              >
                Create Your First Project
              </button>
            )}
            <p>Hard-coded survey IDs for testing:</p>
            <ul>
              <li onClick={() => goToSurvey("63f672d33aec8a376e82f5f8")}>
                63f672d33aec8a376e82f5f8 (Short survey)
              </li>
              <li onClick={() => goToSurvey("63f86abda56f424594a8ffdf")}>
                63f86abda56f424594a8ffdf (Long survey)
              </li>
              {/* <li onClick={() => goToSurvey("65a0124923613a0daa9139be")}>
                65a0124923613a0daa9139be (Party survey)
              </li> */}
              <li onClick={() => goToSurvey("63e3fce4e7193d5358791937")}>
                63e3fce4e7193d5358791937 (Sample survey)
              </li>
            </ul>
          </div>
        )}
      </div>
      </div>
    </AppShell>
  );
};

export default DesignerPage;
