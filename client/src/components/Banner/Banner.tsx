import React from 'react';
import { useNavigate } from 'react-router-dom';
import './banner.css';

interface BannerProps {
  title: string;
  children?: React.ReactNode;
}

const Banner: React.FC<BannerProps> = ({ title, children }) => {
  const navigate = useNavigate();
  
  return (
    <div className="app-banner">
      <div className="banner-title" onClick={() => navigate('/')} role="button" tabIndex={0}>
        {title}
      </div>
      <div className="banner-actions">
        {children}
      </div>
    </div>
  );
};

export default Banner;