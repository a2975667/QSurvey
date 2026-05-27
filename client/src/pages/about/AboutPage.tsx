import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import AppShell from '../../layout/AppShell';
import UserMenu from '../../layout/UserMenu';
import { logout } from '../../features/authSlice';
import { useAccountAvatarMenuProps } from '../../account/useAccountAvatarMenuProps';
import { demoSurveys } from '../../demoSurveys';
import { seoCopy, usePageMetadata } from '../../seo/pageMetadata';
import content from './content.json';
import './about.css';

const AboutPage: React.FC = () => {
  usePageMetadata({
    title: seoCopy.aboutTitle,
    description: seoCopy.aboutDescription,
    canonicalPath: '/about',
  });
  const navigate = useNavigate();
  const auth = useAppSelector(state => state.auth);
  const accountAvatarMenuProps = useAccountAvatarMenuProps(auth);
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
            onSettings={() => navigate('/settings')}
            {...accountAvatarMenuProps}
          />
        ),
      }}
    >
      <div className="about-container">
        <div className="about-content">
          <h1>{content.title}</h1>
          <p className="about-subtitle">{content.subtitle}</p>

          <section className="about-section">
            {content.description.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </section>

          {content.explainers.map((section, index) => (
            <section className="about-section" key={index}>
              <h2>{section.title}</h2>
              {section.paragraphs?.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex}>{paragraph}</p>
              ))}
              {section.items && (
                <ul className="about-list">
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <section className="about-section">
            <h2>{content.findings.title}</h2>
            <p>{content.findings.intro}</p>
            <ul className="about-list research-highlights">
              {content.findings.highlights.map((highlight, index) => (
                <li key={index}>{highlight}</li>
              ))}
            </ul>
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
            <h2>{content.researchUsingQs.title}</h2>
            <p>{content.researchUsingQs.note}</p>
            <ul className="publications-list">
              {content.researchUsingQs.papers.map((paper, index) => (
                <li key={index} className="publication-item">
                  <div className="publication-title">
                    <a href={paper.url} target="_blank" rel="noopener noreferrer">
                      {paper.title}
                    </a>
                    <span className="publication-badge">{paper.type}</span>
                  </div>
                  <div className="publication-meta">
                    {paper.authors}
                  </div>
                  <div className="publication-venue">
                    {paper.venue}
                    {' '}&middot;{' '}
                    <a href={paper.url} target="_blank" rel="noopener noreferrer" className="pdf-link">
                      {paper.linkLabel}
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="about-section">
            <h2>{content.tryQSurvey.title}</h2>
            <p>{content.tryQSurvey.description}</p>
            <ul className="publications-list">
              {demoSurveys.map((demo) => (
                <li key={demo.id} className="publication-item">
                  <div className="publication-title">
                    <a href={`/survey/${demo.id}`}>{demo.title}</a>
                  </div>
                  <div className="publication-meta">
                    {demo.landingDescription}
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
            <p>
              <strong>{content.team.advisorsTitle}</strong>
            </p>
            <ul className="team-list">
              {content.team.advisors.map((advisor, index) => (
                <li key={index}>{advisor.name}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </AppShell>
  );
};

export default AboutPage;
