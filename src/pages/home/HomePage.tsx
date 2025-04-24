import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import './home.css';

const HomePage: React.FC = () => {
  const [surveyId, setSurveyId] = useState('');
  const [sKey, setSKey] = useState('');
  const [uKey, setUKey] = useState('');
  const [uuid, setUuid] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const navigate = useNavigate();
  const auth = useAppSelector(state => state.auth);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (surveyId.trim()) {
      // Build the URL with query parameters
      let url = `/survey/${surveyId.trim()}`;
      
      // Add query parameters if they exist
      const params = new URLSearchParams();
      
      if (sKey.trim()) params.append('sKey', sKey.trim());
      if (uKey.trim()) params.append('uKey', uKey.trim());
      if (uuid.trim()) params.append('uuid', uuid.trim());
      
      // Add parameters to URL if any exist
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
      
      navigate(url);
    }
  };
  
  const handleLogin = () => {
    navigate('/login');
  };
  
  const toggleAdvanced = () => {
    setShowAdvanced(!showAdvanced);
  };
  
  return (
    <div className="home-container">
      <div className="header">
        <div className="logo">Quadratic Survey</div>
        <div className="auth-section">
          <span className="user-status">{auth.isAuthenticated ? auth.user?.email || 'User' : 'Guest'}</span>
          {!auth.isAuthenticated && (
            <button className="login-button" onClick={handleLogin}>
              Login
            </button>
          )}
          {auth.isAuthenticated && (
            <button className="projects-button" onClick={() => navigate('/designer')}>
              My Projects
            </button>
          )}
        </div>
      </div>
      
      <div className="survey-entry">
        <h1>Begin Survey</h1>
        <p>Enter survey ID below</p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={surveyId}
            onChange={(e) => setSurveyId(e.target.value)}
            placeholder="Survey ID"
            className="survey-input"
            required
          />
          
          {/* Advanced options toggle */}
          <div className="advanced-toggle">
            <button 
              type="button" 
              className="toggle-button" 
              onClick={toggleAdvanced}
            >
              {showAdvanced ? '- Hide Advanced Options' : '+ Show Advanced Options'}
            </button>
          </div>
          
          {/* Advanced options section */}
          {showAdvanced && (
            <div className="advanced-options">
              <div className="option-field">
                <label htmlFor="sKey">Static Key (sKey):</label>
                <input
                  id="sKey"
                  type="text"
                  value={sKey}
                  onChange={(e) => setSKey(e.target.value)}
                  placeholder="For password-protected surveys"
                  className="option-input"
                />
              </div>
              
              <div className="option-field">
                <label htmlFor="uKey">Unique Key (uKey):</label>
                <input
                  id="uKey"
                  type="text"
                  value={uKey}
                  onChange={(e) => setUKey(e.target.value)}
                  placeholder="For unique participant identification"
                  className="option-input"
                />
              </div>
              
              <div className="option-field">
                <label htmlFor="uuid">UUID:</label>
                <input
                  id="uuid"
                  type="text"
                  value={uuid}
                  onChange={(e) => setUuid(e.target.value)}
                  placeholder="For resuming a previous session"
                  className="option-input"
                />
              </div>
              
              <div className="option-info">
                <p><strong>Note:</strong> These fields are only required for specific surveys or to resume a previous session.</p>
              </div>
            </div>
          )}
          
          <button type="submit" className="submit-button">
            Start Survey
          </button>
        </form>
      </div>
    </div>
  );
};

export default HomePage;