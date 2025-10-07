import './App.css';
import { QuadraticSurveyPage, SurveyCompletePage } from './pages/survey/components';
import SurveyView from './pages/survey';
import Login from './pages/login';
import HomePage from './pages/home';
import DesignerPage from './pages/designer';
import SurveyEdit from './pages/survey/SurveyEdit';
import SurveyResultsPage from './pages/designer/SurveyResultsPage';
import Logout from './components/Logout';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchMetaData } from './features/metadataSlice';
import { fetchSampleQuestions } from './features/questionsSlice';
import { initQsOptions } from './features/qsOptionsSlice';
import { AppDispatch } from './app/store';
import { useAppSelector } from './app/hooks';
import { useDispatch } from 'react-redux';
import { loginSuccess } from './features/authSlice';

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

const LegacyApp = () => {
  // Get the query string from the URL for version and mode
  const urlParams = new URLSearchParams(window.location.search);
  const version = urlParams.get('version');
  const modeParam = urlParams.get('mode');
  
  // Define surveyKey and style 
  let surveyKey: string;
  let style: "text" | "interactive";

  // Set style based on mode parameter
  style = modeParam === 'text' ? 'text' : 'interactive';

  // This setups the surveyKey based on the version, and can override style if needed
  if (version == "version1") {
    // version1: short, interactive
    surveyKey = "63f672d33aec8a376e82f5f8"
    style = "text"
  } else if (version == "version2") {
    // version2: short, text sna
    surveyKey = "63f672d33aec8a376e82f5f8"
    style = "interactive"
  } else if (version == "version3") {
    // version3: long, interactive
    surveyKey = "63f86abda56f424594a8ffdf"
    style = "text"
  } else if (version == "version4") {
    // version4: long, text sna
    surveyKey = "63f86abda56f424594a8ffdf"
    style = "interactive"
  } else if (version == "party") {
    surveyKey = "65a0124923613a0daa9139be"
    style = "interactive"
  } else {
    // no specific version provided, use sample survey
    surveyKey = "63e3fce4e7193d5358791937"
    // Keep the style from mode parameter in this case
  }

  // setting up the redux store
  const dispatch = useDispatch<AppDispatch>();
  const metadata = useAppSelector(state => state.metadata);
  const qsOptions = useAppSelector(state => state.qsOptions);
  const questions = useAppSelector(state => state.questions);

  useEffect(() => {
    const fetchData = () => {
      dispatch(fetchMetaData(surveyKey));
      dispatch(fetchSampleQuestions(surveyKey));
    };
    fetchData();
  }, [dispatch, surveyKey]);

  const loadedQuestions = useAppSelector((state) => state.questions);

  useEffect(() => {
    if (questions.loaded) {
      dispatch(initQsOptions(loadedQuestions));
    }
  }, [questions.loaded, dispatch, loadedQuestions]);

  if (!metadata.loaded || !qsOptions.loaded || !questions.loaded ) {
    return (
      <>
        <Logout />
        <div>Loading...</div>
      </>
    );
  } else {
    return (
      <>
        <Logout />
        <QuadraticSurveyPage style={style as "text" | "interactive"} />
      </>
    );
  }
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

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home route - accessible to all users */}
        <Route path="/" element={<HomePage />} />
        
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
        
        {/* Legacy route - protected */}
        <Route path="/legacy" element={
          <ProtectedRoute>
            <LegacyApp />
          </ProtectedRoute>
        } />
        
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
    </BrowserRouter>
  );
};

export default App;
