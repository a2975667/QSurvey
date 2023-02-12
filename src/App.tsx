import './App.css';
import TestPage from './pages/test-page';
import { useEffect, useState } from 'react';
import { fetchMetaData } from './features/metadataSlice';
import { fetchSampleQuestions } from './features/questionsSlice';
import { fetchSampleOptions } from './features/qvOptionsSlice';
import store, { AppDispatch } from './app/store';
import { useAppSelector, useAppDispatch } from './app/hooks';
import { useDispatch } from 'react-redux';

const App = () => {
  const dispatch = useDispatch<AppDispatch>();
  const metadata = useAppSelector(state => state.metadata);
  const qvOptions = useAppSelector(state => state.qvOptions);
  const questions = useAppSelector(state => state.questions);

  const surveyKey = "63e3fce4e7193d5358791937"

  // Todo: mid priority, there should be only one single fetch and then check
  // what other data is needed to be fetched to maintian data integrity
  // require some refactoring of the slices, a throwaway state? or useMemo?
  useEffect(() => {
    const fetchData = () => {
      dispatch(fetchMetaData(surveyKey));
      dispatch(fetchSampleQuestions(surveyKey));
      dispatch(fetchSampleOptions( surveyKey));
    };
    fetchData();
  }, [dispatch]);

  if (!metadata.loaded || !qvOptions.loaded || !questions.loaded ) {
    return <div>Loading...</div>;
  } else {
    return <TestPage />;
  }
};

export default App;



