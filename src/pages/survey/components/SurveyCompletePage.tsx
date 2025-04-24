import React from 'react';
import { useAppSelector } from '../../../app/hooks';
import { useNavigate } from 'react-router-dom';
import '../../survey/survey.css';
import '../../home/home.css';

const SurveyCompletePage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useAppSelector(state => state.auth);

  return (
    <div className="home-container">
      <div className="header">
        <div
          className="logo"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/')}
          title="Go to homepage"
        >
          Quadratic Survey System
        </div>
        <div className="auth-section">
          <span className="user-status">{auth.isAuthenticated ? auth.user?.email || 'User' : 'Guest'}</span>
          {!auth.isAuthenticated && (
            <button className="login-button" onClick={() => navigate('/login')}>
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
      <div className="survey-complete-container">
        {/* <div className="survey-complete-header">
          <h1>Survey Complete</h1>
        </div> */}
        <div className="survey-complete-content">
          <div className="success-icon">✓</div>
          <h2>Thank you for completing the survey!</h2>
          <p>Your responses have been submitted successfully.</p>
          <button className="button" onClick={() => navigate('/')}>
            Return to Home
          </button>
          {/* <p>If you were participating in a research study, please check with the researcher for next steps.</p> */}
        </div>
      </div>
    </div>
  );
};

export default SurveyCompletePage;