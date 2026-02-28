import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import AppShell from '../../layout/AppShell';
import UserMenu from '../../layout/UserMenu';
import { logout } from '../../features/authSlice';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import content from './content.json';
import './about.css';

const AboutPage: React.FC = () => {
  useDocumentTitle('About - QSurvey System');
  const navigate = useNavigate();
  const auth = useAppSelector(state => state.auth);
  const dispatch = useAppDispatch();

  const handleLogin = () => {
    navigate('/login');
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
        breadcrumbs: [{ label: 'About' }],
        onTitleClick: () => navigate('/'),
        actions: !auth.isAuthenticated ? (
          <button className="login-button" onClick={handleLogin}>
            Login
          </button>
        ) : (
          <UserMenu
            email={auth.user?.email}
            onLogout={handleLogout}
            onProjects={handleProjects}
          />
        ),
      }}
    >
      <div className="about-container">
        <div className="about-content">
          <h1>{content.title}</h1>

          <section className="about-section">
            {content.description.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </section>

          <section className="about-section">
            <h2>{content.findings.title}</h2>
            <ul className="publications-list">
              {content.findings.papers.map((paper, index) => (
                <li key={index} className="publication-item">
                  <div className="publication-title">
                    <a href={paper.url} target="_blank" rel="noopener noreferrer">
                      {paper.title}
                    </a>
                    {paper.type === 'conference' && (
                      <span className="publication-badge">Conference Paper</span>
                    )}
                    {paper.type === 'poster' && (
                      <span className="publication-badge">Poster</span>
                    )}
                  </div>
                  <div className="publication-meta">
                    {paper.authors}
                  </div>
                  <div className="publication-venue">
                    {paper.venue} ({paper.year})
                    {paper.pdf && (
                      <>
                        {' '}&middot;{' '}
                        <a href={paper.pdf} target="_blank" rel="noopener noreferrer" className="pdf-link">
                          PDF
                        </a>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="about-section">
            <h2>{content.team.title}</h2>
            <ul className="team-list">
              <li>
                <strong>{content.team.lead}</strong>
                {content.team.affiliation && (
                  <> &middot; {content.team.affiliation}</>
                )}
                {content.links.website && (
                  <>
                    {' '}&middot;{' '}
                    <a href={content.links.website} target="_blank" rel="noopener noreferrer">
                      Website
                    </a>
                  </>
                )}
              </li>
              {content.team.members.map((member, index) => (
                <li key={index}>
                  {member.name}
                  {member.website && (
                    <>
                      {' '}&middot;{' '}
                      <a href={member.website} target="_blank" rel="noopener noreferrer">
                        Website
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </AppShell>
  );
};

export default AboutPage;
