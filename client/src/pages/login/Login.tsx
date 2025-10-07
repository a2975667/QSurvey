import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { API_PREFIX } from '../../config';
import { FcGoogle } from 'react-icons/fc';
import { RootState } from '../../app/store';
import { loginSuccess, loginFailure } from '../../features/authSlice';
import './login.css';

const Login: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.auth);
  
  // Check if user is already logged in (has JWT token)
  useEffect(() => {
    if (auth.isAuthenticated && auth.token) {
      navigate('/designer'); // Redirect to projects page
    }
    
    // Check if there's a login_payload cookie from a redirect
    const getCookieValue = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
    };
    
    const loginPayload = getCookieValue('login_payload');
    if (loginPayload) {
      try {
        // Decode the URI components before parsing
        const decodedPayload = decodeURIComponent(loginPayload);
        const payload = JSON.parse(decodedPayload);
        if (payload.access_token) {
          // Dispatch login success action with both token and user data
          dispatch(loginSuccess({ 
            token: payload.access_token,
            user: payload.user 
          }));
          
          // Clear the cookie
          document.cookie = 'login_payload=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          
          // Redirect to projects page instead of home
          navigate('/designer');
        } else if (payload.status === -1) {
          // Handle login error
          dispatch(loginFailure(payload.message || 'Login failed'));
          setErrorMessage(payload.message || 'Login failed');
        }
      } catch (e) {
        setErrorMessage('Error processing login data');
        console.error('Error parsing login payload:', e);
        dispatch(loginFailure('Error processing login data'));
      }
    }
  }, [navigate, dispatch, auth.isAuthenticated, auth.token]);
  
  const handleGoogleLogin = () => {
    setIsLoading(true);
    // Redirect to the backend's Google auth endpoint
    window.location.href = `${API_PREFIX}/google-login`;
  };
  
  return (
    <div className="login-container">
      <div className="login-card">
        <h1>QV System</h1>
        <p className="subtitle">Sign in to continue</p>
        
        {errorMessage && <div className="error-message">{errorMessage}</div>}
        
        <button 
          className="google-login-button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <span>Loading...</span>
          ) : (
            <>
              <FcGoogle className="google-icon" />
              <span>Sign in with Google</span>
            </>
          )}
        </button>
        
        <p className="login-info">
          By signing in, you agree to our terms of service and privacy policy.
        </p>
      </div>
    </div>
  );
};

export default Login;
