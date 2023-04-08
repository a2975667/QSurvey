import './App.css';
import TestPage from './pages/test-page';
import { useEffect } from 'react';
import { fetchMetaData } from './features/metadataSlice';
import { fetchSampleQuestions } from './features/questionsSlice';
import { initQvOptions } from './features/qvOptionsSlice';
import { AppDispatch } from './app/store';
import { useAppSelector } from './app/hooks';
import { useDispatch } from 'react-redux';
import * as rrweb from "rrweb";

const App = () => {

  // get the query string from the URL for version
  const urlParams = new URLSearchParams(window.location.search);
  const version = urlParams.get('version');
  
  // let surveyKey and style be undefined with type string or undefined
  let surveyKey: string;
  let style: string;

  // this setups the surveyKey and style based on the version
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
  } else {
    // no specific verions provided, use sample survey
    surveyKey = "63e3fce4e7193d5358791937"
    style = "interactive"
  }
     
  // log to the console: Participant running version: version
  console.log("Participant running version: " + version)

  // setting up the redux store
  const dispatch = useDispatch<AppDispatch>();
  const metadata = useAppSelector(state => state.metadata);
  const qvOptions = useAppSelector(state => state.qvOptions);
  const questions = useAppSelector(state => state.questions);

  // Todo: mid priority, there should be only one single fetch and then check
  // what other data is needed to be fetched to maintian data integrity
  // require some refactoring of the slices, a throwaway state? or useMemo?
  useEffect(() => {
    const fetchData = () => {
      dispatch(fetchMetaData(surveyKey));
      dispatch(fetchSampleQuestions(surveyKey));
    };
    fetchData();
  }, [dispatch]);

  const loadedQuestions = useAppSelector((state) => state.questions);

  useEffect(() => {
    if (questions.loaded) {
      dispatch(initQvOptions(loadedQuestions));
    }
  }, [questions.loaded]);

    

  if (!metadata.loaded || !qvOptions.loaded || !questions.loaded ) {
    return <div>Loading...</div>;
  } else {
    // pass style to the TestPage
    return <TestPage style={style} />;
  }
};

export default App;


// const surveyKey = "63e3fce4e7193d5358791937"
// experiment controls
// short version
// const surveyKey ="63f672d33aec8a376e82f5f8"

// long version, 24 options
// const surveyKey ="63f86abda56f424594a8ffdf"

