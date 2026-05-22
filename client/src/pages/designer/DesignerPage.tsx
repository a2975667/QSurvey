import React, { useCallback, useEffect, useRef, useState } from 'react';
import './designer.css';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { API_PREFIX } from '../../config';
import { loginSuccess, logout } from '../../features/authSlice';
import { fetchProtected } from '../../lib/protectedFetch';
import AppShell from '../../layout/AppShell';
import UserMenu from '../../layout/UserMenu';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAccountAvatarMenuProps } from '../../account/useAccountAvatarMenuProps';
import { demoSurveys } from '../../demoSurveys';
import { filterAndSortProjects, ProjectsSortMode } from './projectsSearchSort';
import { FiBarChart2, FiCopy, FiEdit3, FiLink, FiMoreVertical } from 'react-icons/fi';

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
    respondentsCanViewResults: boolean;
    locale: 'en-US' | 'zh-TW';
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
  const [openProjectActionsId, setOpenProjectActionsId] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [cloneSurveyId, setCloneSurveyId] = useState<string | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [copyLinkMessage, setCopyLinkMessage] = useState<string | null>(null);
  const [copyLinkError, setCopyLinkError] = useState<string | null>(null);
  const cloneInFlightRef = useRef(false);
  const sortTriggerRef = useRef<HTMLButtonElement | null>(null);
  const projectActionsTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [formData, setFormData] = useState<SurveyFormData>({
    title: '',
    description: '',
    settings: {
      hasSKey: false,
      sKeyValue: '',
      hasUKey: false,
      isAvailable: true,
      respondentsCanViewResults: false,
      locale: 'en-US'
    }
  });
  const [error, setError] = useState<string | null>(null);
  
  const auth = useAppSelector(state => state.auth);
  const accountAvatarMenuProps = useAccountAvatarMenuProps(auth);
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

  const goToSurveyResults = (surveyId: string) => {
    navigate(`/designer/results/${surveyId}`);
  };

  const getSurveyLink = (surveyId: string) => `${window.location.origin}/survey/${surveyId}`;

  const writeSurveyLinkToClipboard = async (link: string) => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(link);
      return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = link;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      const copied = document.execCommand('copy');
      if (!copied) {
        throw new Error('Clipboard fallback copy command was not accepted.');
      }
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const handleCopySurveyLink = async (surveyId: string) => {
    try {
      await writeSurveyLinkToClipboard(getSurveyLink(surveyId));
      setCopyLinkMessage('Survey link copied.');
      setCopyLinkError(null);
    } catch (copyError) {
      setCopyLinkMessage(null);
      setCopyLinkError('Failed to copy survey link. Please try again.');
      console.error('Error copying survey link:', copyError);
    }
  };

  const handleCloneSurvey = async (surveyId: string) => {
    if (cloneInFlightRef.current) {
      return;
    }

    try {
      cloneInFlightRef.current = true;
      setCloneSurveyId(surveyId);
      setCloneError(null);
      setCopyLinkError(null);
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

      let failureMessage = 'Failed to clone survey. Please try again.';
      try {
        const errorData = await response.json();
        if (typeof errorData?.message === 'string' && errorData.message.trim().length > 0) {
          failureMessage = errorData.message;
        }
      } catch (parseError) {
        // Ignore parsing failure and keep the default message.
      }

      setCloneError(failureMessage);
      console.error('Failed to clone survey');
    } catch (cloneError) {
      setCloneError('Failed to clone survey. Please try again.');
      console.error('Error cloning survey:', cloneError);
    } finally {
      cloneInFlightRef.current = false;
      setCloneSurveyId(null);
    }
  };

  const handleCloneTemplate = async (templateId: string) => {
    if (cloneInFlightRef.current) {
      return;
    }

    try {
      cloneInFlightRef.current = true;
      setCloneSurveyId(templateId);
      setCloneError(null);
      setCopyLinkError(null);
      const response = await fetchProtected(
        `${API_PREFIX}/protected/survey-templates/${templateId}/clone`,
        {
          method: 'POST',
        },
        {
          token: auth.token,
          onTokenRefresh: (token) => dispatch(loginSuccess({ token })),
          onAuthFailure: () => handleProtectedAuthFailure(),
        },
      );

      if (response.ok) {
        const clonedSurvey = await response.json();
        navigate(`/survey/${clonedSurvey._id}/edit`);
        return;
      }

      if (response.status === 401 || response.status === 403) {
        return;
      }

      let failureMessage = 'Failed to create survey from template. Please try again.';
      try {
        const errorData = await response.json();
        if (
          typeof errorData?.message === 'string' &&
          errorData.message.trim().length > 0
        ) {
          failureMessage = errorData.message;
        }
      } catch (parseError) {
        // Ignore parsing failure and keep the default message.
      }

      setCloneError(failureMessage);
      console.error('Failed to clone survey template');
    } catch (templateCloneError) {
      setCloneError('Failed to create survey from template. Please try again.');
      console.error('Error cloning survey template:', templateCloneError);
    } finally {
      cloneInFlightRef.current = false;
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

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const nextValue =
      e.target instanceof HTMLInputElement && type === 'checkbox' ? e.target.checked : value;
    setFormData({
      ...formData,
      settings: {
        ...formData.settings,
        [name]: nextValue
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
            isAvailable: true,
            respondentsCanViewResults: false,
            locale: 'en-US'
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

  const closeProjectActionsMenu = useCallback((restoreFocus = false) => {
    const triggerId = openProjectActionsId;
    setOpenProjectActionsId(null);

    if (restoreFocus && triggerId) {
      window.setTimeout(() => {
        const activeElement = document.activeElement as HTMLElement | null;
        const focusStayedInActions = activeElement?.closest?.('.survey-card-actions-menu') != null;
        if (!activeElement || activeElement === document.body || focusStayedInActions) {
          projectActionsTriggerRefs.current[triggerId]?.focus();
        }
      }, 0);
    }
  }, [openProjectActionsId]);

  const closeSortMenu = useCallback((restoreFocus = false) => {
    setSortMenuOpen(false);

    if (restoreFocus) {
      window.setTimeout(() => {
        const activeElement = document.activeElement as HTMLElement | null;
        const focusStayedInSort = activeElement?.closest?.('.projects-sort') != null;
        if (!activeElement || activeElement === document.body || focusStayedInSort) {
          sortTriggerRef.current?.focus();
        }
      }, 0);
    }
  }, []);

  const selectSortMode = useCallback((mode: ProjectsSortMode) => {
    setSortMode(mode);
    closeSortMenu(true);
  }, [closeSortMenu]);

  useEffect(() => {
    if (!sortMenuOpen && !openProjectActionsId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (sortMenuOpen) closeSortMenu(true);
        if (openProjectActionsId) closeProjectActionsMenu(true);
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const withinMenu = target.closest?.('.projects-sort') != null;
      const withinProjectActions = target.closest?.('.survey-card-actions-menu') != null;
      if (sortMenuOpen && !withinMenu) closeSortMenu(false);
      if (openProjectActionsId && !withinProjectActions) closeProjectActionsMenu(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [sortMenuOpen, openProjectActionsId, closeSortMenu, closeProjectActionsMenu]);

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
          <UserMenu
            email={auth.user?.email}
            onLogout={handleLogout}
            onSettings={() => navigate('/settings')}
            {...accountAvatarMenuProps}
          />
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
                      ref={sortTriggerRef}
                      aria-haspopup="menu"
                      aria-expanded={sortMenuOpen}
                      disabled={isLoadingInitialList}
                      onClick={() => {
                        setSortMenuOpen((v) => {
                          if (!v) setOpenProjectActionsId(null);
                          return !v;
                        });
                      }}
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
                              selectSortMode(option.mode);
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

          {cloneError && (
            <div className="error-message" role="alert">
              {cloneError}
            </div>
          )}
          {copyLinkError && (
            <div className="error-message" role="alert">
              {copyLinkError}
            </div>
          )}
          {copyLinkMessage && (
            <div className="survey-copy-status" role="status" aria-live="polite">
              {copyLinkMessage}
            </div>
          )}
        
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
                <div className="form-group">
                  <label htmlFor="locale">Survey Language:</label>
                  <select
                    id="locale"
                    name="locale"
                    value={formData.settings.locale}
                    onChange={handleSettingsChange}
                  >
                    <option value="en-US">English (US)</option>
                    <option value="zh-TW">繁體中文</option>
                  </select>
                </div>
                <div className="checkbox-item checkbox-item-with-help">
                  <div className="checkbox-label-row">
                    <input
                      type="checkbox"
                      id="respondentsCanViewResults"
                      name="respondentsCanViewResults"
                      checked={formData.settings.respondentsCanViewResults}
                      onChange={handleSettingsChange}
                    />
                    <label htmlFor="respondentsCanViewResults">
                      Show selected question results after submission?
                    </label>
                  </div>
                  <p className="setting-help-text">
                    Participants only see results for questions individually enabled in the question editor.
                  </p>
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
              {visibleSurveys.map((survey) => {
                const actionsTriggerId = `survey-card-actions-trigger-${survey._id}`;
                const actionsMenuId = `survey-card-actions-menu-${survey._id}`;

                return (
                  <div key={survey._id} className="survey-item">
                    <div className="survey-card-actions-menu">
                      <button
                        type="button"
                        className="survey-card-actions-trigger"
                        id={actionsTriggerId}
                        ref={(element) => {
                          projectActionsTriggerRefs.current[survey._id] = element;
                        }}
                        onClick={() => setOpenProjectActionsId((currentId) => {
                          const nextId = currentId === survey._id ? null : survey._id;
                          if (nextId) setSortMenuOpen(false);
                          return nextId;
                        })}
                        aria-label={`Project actions for ${survey.title}`}
                        aria-haspopup="menu"
                        aria-controls={openProjectActionsId === survey._id ? actionsMenuId : undefined}
                        aria-expanded={openProjectActionsId === survey._id}
                        title="Project actions"
                      >
                        <FiMoreVertical aria-hidden="true" />
                      </button>
                      {openProjectActionsId === survey._id && (
                        <div
                          id={actionsMenuId}
                          className="survey-card-actions-dropdown"
                          role="menu"
                          aria-labelledby={actionsTriggerId}
                        >
                          <button
                            type="button"
                            className="survey-card-actions-item"
                            onClick={() => {
                              closeProjectActionsMenu(true);
                              goToSurvey(survey._id);
                            }}
                            role="menuitem"
                          >
                            <FiLink aria-hidden="true" />
                            <span>Preview Survey</span>
                          </button>
                          <button
                            type="button"
                            className="survey-card-actions-item"
                            onClick={() => {
                              closeProjectActionsMenu(true);
                              goToSurveyResults(survey._id);
                            }}
                            role="menuitem"
                          >
                            <FiBarChart2 aria-hidden="true" />
                            <span>Results</span>
                          </button>
                          <button
                            type="button"
                            className="survey-card-actions-item"
                            onClick={() => {
                              closeProjectActionsMenu(true);
                              handleCloneSurvey(survey._id);
                            }}
                            disabled={cloneSurveyId !== null}
                            role="menuitem"
                          >
                            <FiCopy aria-hidden="true" />
                            <span>Clone survey</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <h3>{survey.title}</h3>
                    <p>{survey.description}</p>
                    {/* <span className="survey-date">ID: {survey._id}</span> */}
                    <div className="survey-actions">
                      <button
                        type="button"
                        className="copy-survey-link-btn"
                        onClick={() => handleCopySurveyLink(survey._id)}
                        aria-label={`Copy survey link for ${survey.title}`}
                        title="Copy survey link"
                      >
                        <FiLink aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="edit-survey-btn"
                        onClick={() => navigate(`/survey/${survey._id}/edit`)}
                      >
                        <FiEdit3 aria-hidden="true" />
                        <span>Edit Survey</span>
                      </button>
                    </div>
                  </div>
                );
              })}
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
                type="button"
                className="create-first-survey-btn"
                onClick={() => setShowCreateForm(true)}
              >
                Create Your First Project
              </button>
            )}
            <div className="designer-example-surveys">
              <p>Start from a template:</p>
              <ul aria-label="Survey templates">
                {demoSurveys.map((example) => (
                  <li key={example.id}>
                    <button
                      type="button"
                      onClick={() => handleCloneTemplate(example.id)}
                      disabled={cloneSurveyId !== null}
                    >
                      <span>{example.title}</span>
                      <small>{example.designerDescription}</small>
                      <strong>Use template</strong>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
      </div>
    </AppShell>
  );
};

export default DesignerPage;
