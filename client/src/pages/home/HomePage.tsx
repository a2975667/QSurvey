import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import AppShell from '../../layout/AppShell';
import './home.css';
import UserMenu from '../../layout/UserMenu';
import { logout } from '../../features/authSlice';
import { useAccountAvatarMenuProps } from '../../account/useAccountAvatarMenuProps';
import { demoSurveys } from '../../demoSurveys';
import { seoCopy, usePageMetadata } from '../../seo/pageMetadata';

const HomePage: React.FC = () => {
  usePageMetadata({
    title: seoCopy.title,
    description: seoCopy.description,
    openGraphTitle: seoCopy.ogTitle,
    canonicalPath: '/',
  });
  const [surveyId, setSurveyId] = useState('');
  const [sKey, setSKey] = useState('');
  const [uKey, setUKey] = useState('');
  const [uuid, setUuid] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const navigate = useNavigate();
  const auth = useAppSelector(state => state.auth);
  const accountAvatarMenuProps = useAccountAvatarMenuProps(auth);
  const dispatch = useAppDispatch();
  
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
  
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleProjects = () => {
    navigate('/designer');
  };
  
  return (
    <AppShell
      appBarProps={{
        title: 'QSurvey System',
        onTitleClick: () => navigate('/'),
        navLinks: [{ label: 'About', onClick: () => navigate('/about') }],
        actions: !auth.isAuthenticated ? (
          <button className="login-button" onClick={handleLogin}>
            Login
          </button>
        ) : (
          <UserMenu
            email={auth.user?.email}
            onLogout={handleLogout}
            onProjects={handleProjects}
            onSettings={() => navigate('/settings')}
            {...accountAvatarMenuProps}
          />
        ),
      }}
    >
      <div className="home-container">
        <div className="survey-entry">
          <section className="demo-surveys" aria-labelledby="demo-surveys-heading">
            <h1 id="demo-surveys-heading">Try Quadratic Survey</h1>
            <p>Choose a demo to see how QS elicits your preferences across multiple options.</p>
            <div className="demo-survey-grid" aria-label="Demo surveys">
              {demoSurveys.map((demo) => (
                <article className="demo-survey-card" key={demo.id}>
                  <h3>{demo.title}</h3>
                  <p>{demo.landingDescription}</p>
                  <button
                    type="button"
                    onClick={() => navigate(`/survey/${demo.id}`)}
                    className="submit-button"
                    aria-label={`Try Quadratic Survey: ${demo.title}`}
                  >
                    Try Quadratic Survey
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="home-actions" aria-label="Create or begin survey">
            <article className="home-action-card">
              <h2>Create your own Quadratic Survey</h2>
              <p>
                {auth.isAuthenticated
                  ? 'Open your projects to create and manage Quadratic Surveys.'
                  : 'Log in to design and manage your own QS projects.'}
              </p>
              <button
                type="button"
                className="submit-button"
                onClick={auth.isAuthenticated ? handleProjects : handleLogin}
              >
                {auth.isAuthenticated ? 'Open Projects' : 'Log in to create'}
              </button>
            </article>

            <article className="home-action-card survey-id-entry">
              <h2 id="survey-id-entry-heading">Begin Survey</h2>
              <p>Already have a survey link or ID? Enter it below.</p>

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
            </article>
          </section>
        </div>
      </div>
    </AppShell>
  );
};

export default HomePage;
