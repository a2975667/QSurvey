import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="footer-content simple">
        <a
          className="open-source-badge"
          href="https://github.com/a2975667/QSurvey"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="QSurvey open source repository on GitHub"
        >
          Open source on GitHub
        </a>
        <p><strong>Experiment Preview Demo</strong> - Submitting the survey and using the system means providing data to the demo database; it will not be used in studies or applications without prior consent, this is demo only. Contact: tcheng10[at]illinois.edu if you'd like to use it. Version 0.2.0-alpha-052120262109</p>
      </div>
      {/* <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} QV System</p>
      </div> */}
    </footer>
  );
};

export default Footer;
