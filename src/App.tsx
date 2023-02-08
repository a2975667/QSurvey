import './App.css';
import TestPage from './pages/test-page';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { fetchSampleSurvey } from './features/metadataSlice';
import { fetchSampleQuestions } from './features/questionsSlice';
import { fetchSampleOptions } from './features/qvOptionsSlice';

const App = () => {

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchSampleSurvey());
    dispatch(fetchSampleQuestions());
    dispatch(fetchSampleOptions());
  }, [dispatch]);


  return (
    <TestPage/>
  );
}

export default App;