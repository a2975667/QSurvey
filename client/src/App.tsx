import './App.css';
import { SurveyCompletePage } from './pages/survey/components';
import SurveyView from './pages/survey';
import Login from './pages/login';
import HomePage from './pages/home';
import DesignerPage from './pages/designer';
import SurveyEdit from './pages/survey/SurveyEdit';
import SurveyResultsPage from './pages/designer/SurveyResultsPage';
import AboutPage from './pages/about';
import AccountSettingsPage from './pages/account';
import Logout from './components/Logout';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { fetchMetaData } from './features/metadataSlice';
import { fetchSampleQuestions } from './features/questionsSlice';
import { AppDispatch } from './app/store';
import { useAppSelector } from './app/hooks';
import { useDispatch } from 'react-redux';
import { loginSuccess } from './features/authSlice';
import type { AnalyticsConsent } from './analytics/googleAnalytics';
import {
  getAnalyticsConsent,
  initAnalytics,
  setAnalyticsConsent,
  shouldRequestAnalyticsConsent,
  trackPageView,
} from './analytics/googleAnalytics';

// Protected route component that checks for authentication
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const [isLoading, setIsLoading] = useState(true);
  const auth = useAppSelector(state => state.auth);
  
  useEffect(() => {
    // Just a small delay to ensure auth state is loaded
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (isLoading) {
    return <div>Checking authentication...</div>;
  }
  
  if (!auth.isAuthenticated) {
    return <Navigate to="/" />;
  }
  
  return children;
};


// LoginSuccess component to handle auth redirect with URL parameters
const LoginSuccess = () => {
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Get parameters from URL
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    const userId = searchParams.get('userId');
    const roles = searchParams.get('roles');
    
    if (token) {
      // Create user object from URL parameters
      const user = {
        id: userId,
        email: email,
        roles: roles ? JSON.parse(roles) : []
      };
      
      // Dispatch login success with token and user data
      dispatch(loginSuccess({ token, user }));
      
      // Redirect to projects page
      navigate('/designer'); // Updated path to match our DesignerPage route
    } else {
      // If no token, redirect to login page
      navigate('/login');
    }
  }, [searchParams, dispatch, navigate]);
  
  return <div>Logging you in...</div>;
};

const AnalyticsRouteTracker = ({ consent }: { consent: AnalyticsConsent }) => {
  const location = useLocation();
  const lastTrackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    initAnalytics(undefined, undefined, consent);
  }, [consent]);

  useEffect(() => {
    const currentPath = location.pathname || '/';

    if (lastTrackedPathRef.current !== currentPath && initAnalytics(undefined, undefined, consent)) {
      trackPageView(location, undefined, consent);
      lastTrackedPathRef.current = currentPath;
    }
  }, [consent, location]);

  return null;
};

const AnalyticsConsentBanner = ({
  consent,
  onConsentChange,
}: {
  consent: AnalyticsConsent;
  onConsentChange: (consent: Exclude<AnalyticsConsent, null>) => void;
}) => {
  if (!shouldRequestAnalyticsConsent(consent)) {
    return null;
  }

  return (
    <div className="analytics-consent-banner" role="region" aria-label="Analytics consent">
      <p className="analytics-consent-copy">
        QSurvey uses first-party storage for site functionality and Google Analytics for usage signals. Before
        you accept, Google Analytics runs without analytics cookie storage where supported. Page views are sent
        without query strings or survey keys.
      </p>
      <div className="analytics-consent-actions">
        <button
          type="button"
          className="analytics-consent-secondary"
          onClick={() => onConsentChange('declined')}
        >
          Decline
        </button>
        <button
          type="button"
          className="analytics-consent-primary"
          onClick={() => onConsentChange('accepted')}
        >
          Accept analytics
        </button>
      </div>
    </div>
  );
};

const App = () => {
  const [analyticsConsent, setAnalyticsConsentState] = useState<AnalyticsConsent>(() => getAnalyticsConsent());

  const handleAnalyticsConsentChange = (consent: Exclude<AnalyticsConsent, null>) => {
    setAnalyticsConsent(consent);
    setAnalyticsConsentState(consent);
  };

  return (
    <BrowserRouter>
      <AnalyticsRouteTracker consent={analyticsConsent} />
      <Routes>
        {/* Home route - accessible to all users */}
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />

        {/* Authentication routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/login-success" element={<LoginSuccess />} />
        
        {/* Designer routes - protected */}
        <Route path="/designer" element={
          <ProtectedRoute>
            <DesignerPage />
          </ProtectedRoute>
        } />
        <Route path="/designer/results/:surveyId" element={
          <ProtectedRoute>
            <SurveyResultsPage />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <AccountSettingsPage />
          </ProtectedRoute>
        } />
        
        {/* Legacy route removed as part of cleanup */}
        
        {/* Survey routes */}
        <Route path="/survey/:id" element={<SurveyView />} />
        <Route path="/survey/:id/complete" element={<SurveyCompletePage />} />
        <Route path="/survey/:surveyId/edit" element={
          <ProtectedRoute>
            <SurveyEdit />
          </ProtectedRoute>
        } />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <AnalyticsConsentBanner
        consent={analyticsConsent}
        onConsentChange={handleAnalyticsConsentChange}
      />
    </BrowserRouter>
  );
};

export default App;
