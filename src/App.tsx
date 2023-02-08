import './App.css';
import TestPage from './pages/test-page';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMetaData } from './features/metadataSlice';
import { fetchSampleQuestions } from './features/questionsSlice';
import { fetchSampleOptions } from './features/qvOptionsSlice';

const App = () => {
  const dispatch = useDispatch();
  const metadataLoaded = useSelector(state => state.metadata.loaded);
  const qvOptionsLoaded = useSelector(state => state.qvOptions.loaded);
  const questionsLoaded = useSelector(state => state.questions.loaded);

  useEffect(() => {
    const fetchData = () => {
      dispatch(fetchMetaData());
      dispatch(fetchSampleQuestions());
      dispatch(fetchSampleOptions());
    };
    fetchData();
  }, [dispatch]);

  if (!metadataLoaded || !questionsLoaded || !qvOptionsLoaded) {
    return <div>Loading...</div>;
  } else {
    return <TestPage />;
  }
};

export default App;



