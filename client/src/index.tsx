import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './app/store';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// reset all eventRecord upon refresh/reload
window.localStorage.removeItem("eventRecords");

// Development-only: silence known third-party deprecation warning from react-beautiful-dnd
if (process.env.NODE_ENV !== 'production') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (msg.includes('Connect(Droppable): Support for defaultProps will be removed from memo components')) {
      return;
    }
    originalError(...args);
  };
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <Provider store={store}>
    <App />
  </Provider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
