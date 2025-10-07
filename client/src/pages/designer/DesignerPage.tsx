import React, { useEffect, useState } from 'react';
import Logout from '../../components/Logout';
import Banner from '../../components/Banner';
import './designer.css';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { API_PREFIX } from '../../config';
import { loginSuccess } from '../../features/authSlice';

interface Survey {
  _id: string;
  title: string;
  description: string;
  createdAt: string;
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
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
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

  useEffect(() => {
    // Only fetch if authenticated
    if (auth.isAuthenticated && auth.token) {
      fetchUserSurveys();
    }
  }, [auth.isAuthenticated, auth.token]);

  const fetchUserSurveys = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_PREFIX}/protected/surveys`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });
      
      if (response.ok) {
        const newToken = response.headers.get('X-New-Access-Token');
        if (newToken) {
          dispatch(loginSuccess({ token: newToken }));
        }
        const data = await response.json();
        setSurveys(data);
      } else {
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
      
      const response = await fetch(`${API_PREFIX}/protected/surveys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const newToken = response.headers.get('X-New-Access-Token');
        if (newToken) {
          dispatch(loginSuccess({ token: newToken }));
        }
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

  return (
    <>
      <Banner title="Quadratic Survey Designer">
        <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
          <Logout />
        </div>
      </Banner>
      <div className="designer-container">
        <div className="designer-content">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '30px',
            padding: '15px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px'
          }}>
          <h2 style={{ margin: 0, fontSize: '28px', color: '#333' }}>My QS Projects</h2>
          {surveys.length < 20 ? (
            <button 
              onClick={() => setShowCreateForm(!showCreateForm)}
              style={{ 
                backgroundColor: '#4CAF50', 
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              {showCreateForm ? '✕ Cancel' : '+ Create New QS Project'}
            </button>
          ) : (
            <button disabled title="Max surveys reached (20)" style={{
              backgroundColor: '#ccc',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '4px',
              cursor: 'not-allowed',
              fontSize: '16px',
              fontWeight: 'bold'
            }}>
              Limit Reached
            </button>
          )}
        </div>
        
        {showCreateForm && surveys.length < 20 && (
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
          <div className="surveys-list">
            {surveys.map(survey => (
              <div key={survey._id} className="survey-item">
                <h3>{survey.title}</h3>
                <p>{survey.description}</p>
                <span className="survey-date">ID: {survey._id}</span>
                <div className="survey-actions">
                  <button 
                    className="view-survey-btn"
                    onClick={() => goToSurvey(survey._id)}
                  >
                    View Survey
                  </button>
                  <button 
                    className="edit-survey-btn"
                    onClick={() => navigate(`/survey/${survey._id}/edit`)}
                  >
                    Edit Survey
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-surveys">
            <p>You don't have any QS projects yet. Create one to get started!</p>
            {!showCreateForm && (
              <button 
                className="create-first-survey-btn"
                onClick={() => setShowCreateForm(true)}
              >
                Create Your First QS Project
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
    </>
  );
};

export default DesignerPage;
