import './App.css';
import TestPage from './pages/test-page';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { fetchSampleSurvey } from './features/metadataSlice';
import { fetchSampleQuestions } from './features/questionsSlice';
import { fetchSampleOptions } from './features/qvOptionsSlice';

const App = () => {
  const dispatch = useDispatch();
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      dispatch(fetchSampleSurvey()),
      dispatch(fetchSampleQuestions()),
      dispatch(fetchSampleOptions())
    ]).then(() => {
      setLoading(false);
    });
  }, [dispatch]);

  return isLoading ? <div>Loading...</div> : <TestPage />;
};

export default App;