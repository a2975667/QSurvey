import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { API_PREFIX } from '../../config';
import './surveyEdit.css';
import { Types } from 'mongoose';
import { loginSuccess, logout } from '../../features/authSlice';
import AppShell from '../../layout/AppShell';
import UserMenu from '../../layout/UserMenu';
import { MdChevronLeft } from 'react-icons/md';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

interface QSOption {
  optionId?: string;
  optionName: string;
  description: string;
}

interface BaseQuestion {
  _id?: string;
  type: string;
  question: string;
  description: string;
  groupId?: string;
  insertPosition?: number;
}

interface QSQuestion extends BaseQuestion {
  type: 'qv';
  setting: {
    totalCredits: number;
    version: number;
    questionType: string;
    sampleOption: number;
  };
  options: QSOption[];
}

interface LikertQuestion extends BaseQuestion {
  type: 'likert';
  scale: string[];
  minLabel?: string;
  maxLabel?: string;
}

interface TextQuestion extends BaseQuestion {
  type: 'text';
  multiline: boolean;
  maxLength?: number;
}

interface ApprovalQuestion extends BaseQuestion {
  type: 'approval';
  randomizeOptions?: boolean;
  options: QSOption[];
}

type QuestionTypes = QSQuestion | LikertQuestion | TextQuestion | ApprovalQuestion;

const createDefaultQvOptions = (): QSOption[] => [
  { optionName: '', description: '' },
  { optionName: '', description: '' }
];

const computeQvCredits = (optionCount: number) =>
  Math.floor(4 * Math.pow(optionCount, 1.5));

const createDefaultQvQuestion = (question = '', description = ''): QSQuestion => {
  const options = createDefaultQvOptions();
  return {
    type: 'qv',
    question,
    description,
    setting: {
      totalCredits: computeQvCredits(options.length),
      version: 1,
      questionType: 'qv',
      sampleOption: 0
    },
    options
  };
};

// Need to extend the backend types to include _doc property
interface BackendQuestion {
  _id?: string;
  _doc?: any; // Backend MongoDB sometimes returns data in _doc
  type: string;
  question: string;
  description: string;
  setting?: any;
  options?: any[];
  scale?: string[];
  minLabel?: string;
  maxLabel?: string;
  multiline?: boolean;
  maxLength?: number;
  groupId?: string;
  randomizeOptions?: boolean;
}

interface Survey {
  _id: string;
  title: string;
  description: string;
  questions: BackendQuestion[];
  settings: {
    hasSKey: boolean;
    sKeyValue: string;
    hasUKey: boolean;
    isAvailable: boolean;
  };
  questionGroups?: QuestionGroup[];
  collaborators?: string[];
}

interface QuestionGroup {
  id: string;
  title: string;
  description?: string;
  questionIds: string[];
}

interface Collaborator {
  userId: string;
  email: string;
  isSelf?: boolean;
}

const SurveyEdit: React.FC = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();
  const auth = useAppSelector(state => state.auth);
  const dispatch = useAppDispatch();
  
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [collaboratorInput, setCollaboratorInput] = useState('');
  const [collabLoading, setCollabLoading] = useState(false);
  const [collabSaving, setCollabSaving] = useState(false);
  const [collabError, setCollabError] = useState<string | null>(null);
  const [editingCollaborators, setEditingCollaborators] = useState(false);
  
  // Set document title - must be before any conditional returns (memoized to prevent unnecessary updates)
  const documentTitle = useMemo(
    () => `Edit ${survey?.title || 'Untitled survey'} – QSurvey System`,
    [survey?.title]
  );
  useDocumentTitle(documentTitle);
  
  // Survey settings edit mode
  const [editingSurveySettings, setEditingSurveySettings] = useState(false);
  const [surveySettings, setSurveySettings] = useState<{
    title: string;
    description: string;
    hasSKey: boolean;
    sKeyValue: string;
    hasUKey: boolean;
    isAvailable: boolean;
  }>({
    title: '',
    description: '',
    hasSKey: false,
    sKeyValue: '',
    hasUKey: false,
    isAvailable: true
  });
  
  // Question form states
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionType, setQuestionType] = useState<'qv' | 'likert' | 'text' | 'approval'>('qv');
  const [questionFormData, setQuestionFormData] = useState<QuestionTypes>(() =>
    createDefaultQvQuestion()
  );
  
  // Question grouping
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupFormData, setGroupFormData] = useState<{
    id?: string;
    title: string;
    description: string;
    questionIds: string[];
  }>({
    title: '',
    description: '',
    questionIds: []
  });
  
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);

  const resolveQuestionType = (question: BackendQuestion | any): 'qv' | 'likert' | 'text' | 'approval' => {
    const raw =
      question?.type ||
      question?.questionType ||
      question?.setting?.questionType ||
      question?._doc?.type ||
      question?._doc?.questionType ||
      question?._doc?.setting?.questionType ||
      '';
    const normalized = (raw || '').toString().toLowerCase();
    if (normalized === 'likert') return 'likert';
    if (normalized === 'text' || normalized === 'textinput') return 'text';
    if (normalized === 'approval') return 'approval';
    return 'qv';
  };

  const handleAddQuestionClick = () => {
    setQuestionType('qv');
    setQuestionFormData(createDefaultQvQuestion());
    setEditingQuestionId(null);
    setShowQuestionForm(true);
    setError(null);
  };

  const fetchCollaborators = async () => {
    if (!auth.token || !surveyId) {
      return;
    }
    try {
      setCollabLoading(true);
      setCollabError(null);
      const response = await fetch(`${API_PREFIX}/protected/surveys/${surveyId}/collaborators`, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setCollabError(errorData.message || 'Failed to fetch collaborators');
        return;
      }
      const data = await response.json();
      const incoming: Collaborator[] = Array.isArray(data?.collaborators)
        ? data.collaborators.map((c: any) => ({
            userId: c.userId,
            email: c.email,
            isSelf: Boolean(c.isSelf),
          }))
        : [];
      setCollaborators(incoming);
    } catch (err) {
      setCollabError('Failed to fetch collaborators');
    } finally {
      setCollabLoading(false);
    }
  };

  useEffect(() => {
    if (auth.isAuthenticated && auth.token && surveyId) {
      fetchSurvey();
    }
  }, [auth.isAuthenticated, auth.token, surveyId]);
  
  // Populate survey settings when the survey is fetched
  useEffect(() => {
    if (survey) {
      setSurveySettings({
        title: survey.title,
        description: survey.description,
        hasSKey: survey.settings.hasSKey,
        sKeyValue: survey.settings.sKeyValue || '',
        hasUKey: survey.settings.hasUKey,
        isAvailable: survey.settings.isAvailable
      });
    }
  }, [survey]);

  const fetchSurvey = async () => {
    try {
      setLoading(true);
      
      // Step 1: Try the protected endpoint first
      const response = await fetch(`${API_PREFIX}/protected/surveys/${surveyId}`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });
      
      if (response.ok) {
        const newToken = response.headers.get('X-New-Access-Token');
        if (newToken) {
          dispatch(loginSuccess({ token: newToken }));
        }
        const data = await response.json();
        console.log('Raw survey data from protected API:', data);
        
        const isPopulatedQuestion = (q: any): boolean => {
          if (!q || typeof q !== 'object') return false;
          const normalizedType = resolveQuestionType(q);
          if (normalizedType === 'qv') {
            return Array.isArray(q.options) && q.options.length > 0;
          }
          return typeof q.question === 'string';
        };

        // Check if questions are full objects or just IDs
        let usePublicAPI = false;
        if (data.questions && Array.isArray(data.questions)) {
          console.log('Number of questions:', data.questions.length);
          
          if (data.questions.length > 0) {
            const firstQuestion = data.questions[0];
            console.log('First question type:', typeof firstQuestion);
            
            // If the question is just an ID (string) or an unpopulated QV, use public API
            if (typeof firstQuestion === 'string' || !isPopulatedQuestion(firstQuestion)) {
              console.log('Questions may be unpopulated. Using public API as fallback.');
              usePublicAPI = true;
            } else {
              console.log('First question example:', JSON.stringify(firstQuestion, null, 2));
            }
            // If any question in the list is unpopulated, trigger the fallback
            if (!usePublicAPI) {
              usePublicAPI = data.questions.some((q: any) => typeof q === 'string' || !isPopulatedQuestion(q));
              if (usePublicAPI) {
                console.log('Detected unpopulated questions in the list. Using public API as fallback.');
              }
            }
          }
        }
        
        // If we need full question objects, use the public API as fallback
        if (usePublicAPI) {
          console.log('Falling back to public API to get full question data');
          try {
            const publicResponse = await fetch(`${API_PREFIX}/surveys/${surveyId}`);
            
            if (publicResponse.ok) {
              const publicData = await publicResponse.json();
              console.log('Survey data from public API:', publicData);
              
              if (publicData.questions && Array.isArray(publicData.questions) && 
                  publicData.questions.length > 0 && 
                  typeof publicData.questions[0] === 'object') {
                
                console.log('Using questions from public API');
                // Merge the public API's populated questions with the protected data
                data.questions = publicData.questions;
                setSurvey(data);
                await fetchCollaborators();
              } else {
                console.log('Public API also failed to return full question objects');
                setSurvey(data); // Use original data as fallback
              }
            } else {
              console.log('Public API request failed, using original data');
              setSurvey(data);
            }
          } catch (fallbackError) {
            console.log('Public API request threw, using original data', fallbackError);
            setSurvey(data);
          }
        } else {
          // Questions are already populated correctly
          setSurvey(data);
          await fetchCollaborators();
        }
      } else {
        console.error('Failed to fetch survey:', await response.text());
        setError('Failed to fetch survey details');
      }
    } catch (error) {
      console.error('Error fetching survey:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionTypeChange = (type: 'qv' | 'likert' | 'text' | 'approval') => {
    setQuestionType(type);
    
    // Reset the form with appropriate defaults based on type
    if (type === 'qv') {
      setQuestionFormData(
        createDefaultQvQuestion(
          questionFormData.question || '',
          questionFormData.description || ''
        )
      );
    } else if (type === 'likert') {
      setQuestionFormData({
        type: 'likert',
        question: questionFormData.question || '',
        description: questionFormData.description || '',
        // Default to numeric 1–5 scale; tests expect this shape.
        scale: ['1', '2', '3', '4', '5'],
        minLabel: 'Strongly Disagree',
        maxLabel: 'Strongly Agree'
      } as LikertQuestion);
    } else if (type === 'text') {
      const previous = questionFormData as Partial<TextQuestion>;
      setQuestionFormData({
        type: 'text',
        question: questionFormData.question || '',
        description: questionFormData.description || '',
        multiline: previous.type === 'text' ? !!previous.multiline : false,
        maxLength:
          previous.type === 'text' && typeof previous.maxLength === 'number'
            ? previous.maxLength
            : 500,
        groupId: previous.type === 'text' ? previous.groupId : undefined
      } as TextQuestion);
    } else if (type === 'approval') {
      const previous = questionFormData as Partial<ApprovalQuestion>;
      setQuestionFormData({
        type: 'approval',
        question: questionFormData.question || '',
        description: questionFormData.description || '',
        randomizeOptions:
          previous.type === 'approval' && typeof previous.randomizeOptions === 'boolean'
            ? previous.randomizeOptions
            : true,
        options:
          previous.type === 'approval' && Array.isArray(previous.options) && previous.options.length > 0
            ? previous.options
            : [
                { optionName: '', description: '' },
                { optionName: '', description: '' }
              ]
      } as ApprovalQuestion);
    }
  };

  const handleQuestionInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setQuestionFormData({
      ...questionFormData,
      [name]: value
    });
  };

  const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = name === 'totalCredits' || name === 'sampleOption' || name === 'maxLength'
      ? parseInt(value, 10) 
      : value;
    
    if (questionType === 'qv') {
      // Handle QS question settings
      const qvQuestion = questionFormData as QSQuestion;
      setQuestionFormData({
        ...qvQuestion,
        setting: {
          ...qvQuestion.setting,
          [name]: numValue
        }
      } as QSQuestion);
    } else if (questionType === 'text') {
      const textQuestion = questionFormData as TextQuestion;
      if (name === 'multiline') {
        const checked = (e.target as HTMLInputElement).checked;
        let nextMaxLength = textQuestion.maxLength;

        if (checked) {
          nextMaxLength = undefined;
        } else if (!textQuestion.maxLength) {
          // Default for short answers when toggling back from multi-line
          nextMaxLength = 600;
        }

        setQuestionFormData({
          ...textQuestion,
          multiline: checked,
          maxLength: nextMaxLength
        } as TextQuestion);
      } else if (name === 'maxLength') {
        const rawValue = (e.target as HTMLInputElement).value;
        const parsedValue =
          rawValue === '' ? undefined : parseInt(rawValue, 10);
        setQuestionFormData({
          ...textQuestion,
          maxLength:
            parsedValue === undefined || Number.isNaN(parsedValue)
              ? undefined
              : parsedValue
        } as TextQuestion);
      }
    } else if (questionType === 'approval') {
      if (name === 'randomizeOptions') {
        const approvalQuestion = questionFormData as ApprovalQuestion;
        setQuestionFormData({
          ...approvalQuestion,
          randomizeOptions: (e.target as HTMLInputElement).checked
        } as ApprovalQuestion);
      }
    } else if (questionType === 'likert') {
      if (name === 'minLabel' || name === 'maxLabel') {
        // Handle scale labels for Likert questions
        const likertQuestion = questionFormData as LikertQuestion;
        setQuestionFormData({
          ...likertQuestion,
          [name]: value
        } as LikertQuestion);
      }
    }
  };

  const handleOptionChange = (index: number, field: string, value: string) => {
    if (questionType === 'qv') {
      const qvQuestion = questionFormData as QSQuestion;
      const updatedOptions = [...qvQuestion.options];
      updatedOptions[index] = {
        ...updatedOptions[index],
        [field]: value
      };
      
      setQuestionFormData({
        ...qvQuestion,
        options: updatedOptions
      } as QSQuestion);
    } else if (questionType === 'approval') {
      const approvalQuestion = questionFormData as ApprovalQuestion;
      const updatedOptions = [...approvalQuestion.options];
      updatedOptions[index] = {
        ...updatedOptions[index],
        [field]: value,
      };

      setQuestionFormData({
        ...approvalQuestion,
        options: updatedOptions,
      } as ApprovalQuestion);
    } else if (questionType === 'likert') {
      const likertQuestion = questionFormData as LikertQuestion;
      const updatedScale = [...likertQuestion.scale];
      updatedScale[index] = value;
      
      setQuestionFormData({
        ...likertQuestion,
        scale: updatedScale
      } as LikertQuestion);
    }
  };
  
  const addOption = () => {
    if (questionType === 'qv') {
      const qvQuestion = questionFormData as QSQuestion;
      const updatedOptions = [
        ...qvQuestion.options,
        { optionName: '', description: '' }
      ];
      const newCredits = Math.floor(4 * Math.pow(updatedOptions.length, 1.5));
      setQuestionFormData({
        ...qvQuestion,
        options: updatedOptions,
        setting: { ...qvQuestion.setting, totalCredits: newCredits }
      } as QSQuestion);
    } else if (questionType === 'approval') {
      const approvalQuestion = questionFormData as ApprovalQuestion;
      const updatedOptions = [
        ...approvalQuestion.options,
        { optionName: '', description: '' },
      ];
      setQuestionFormData({
        ...approvalQuestion,
        options: updatedOptions,
      } as ApprovalQuestion);
    } else if (questionType === 'likert') {
      const likertQuestion = questionFormData as LikertQuestion;
      const scale = [...likertQuestion.scale, ''];
      setQuestionFormData({
        ...likertQuestion,
        scale
      } as LikertQuestion);
    }
  };

  const removeOption = (index: number) => {
    if (questionType === 'qv') {
      const qvQuestion = questionFormData as QSQuestion;
      if (qvQuestion.options.length <= 2) {
        setError('QS questions must have at least 2 options');
        return;
      }
      
      const updatedOptions = [...qvQuestion.options];
      updatedOptions.splice(index, 1);
      const newCredits = Math.floor(4 * Math.pow(updatedOptions.length, 1.5));
      setQuestionFormData({
        ...qvQuestion,
        options: updatedOptions,
        setting: { ...qvQuestion.setting, totalCredits: newCredits }
      } as QSQuestion);
    } else if (questionType === 'likert') {
      const likertQuestion = questionFormData as LikertQuestion;
      if (likertQuestion.scale.length <= 2) {
        setError('Likert scale must have at least 2 points');
        return;
      }
      
      const updatedScale = [...likertQuestion.scale];
      updatedScale.splice(index, 1);
      
      setQuestionFormData({
        ...likertQuestion,
        scale: updatedScale
      } as LikertQuestion);
    } else if (questionType === 'approval') {
      const approvalQuestion = questionFormData as ApprovalQuestion;
      if (approvalQuestion.options.length <= 1) {
        setError('Approval questions must have at least 1 option');
        return;
      }
      const updatedOptions = [...approvalQuestion.options];
      updatedOptions.splice(index, 1);
      setQuestionFormData({
        ...approvalQuestion,
        options: updatedOptions
      } as ApprovalQuestion);
    }
  };

  const handleEditQuestion = (question: any) => {
    console.log('Editing question:', question);
    
    // Get the question ID - try both possible locations
    const questionId = question._id || (question._doc && question._doc._id);
    setEditingQuestionId(questionId);
    
    // Get question type (handles legacy shapes)
    const questionType = resolveQuestionType(question);
    setQuestionType(questionType);
    
    // Extract the basic properties common to all question types
    const questionText = question.question || (question._doc && question._doc.question) || '';
    const questionDesc = question.description || (question._doc && question._doc.description) || '';
    
    // Handle different question types
    if (questionType === 'qv') {
      // Get the options - try both possible locations
      const questionOptions = Array.isArray(question.options) 
        ? question.options 
        : (question._doc && Array.isArray(question._doc.options) 
            ? question._doc.options 
            : []);
            
      // Compute credits based on number of options
      const newCredits = Math.floor(4 * Math.pow(questionOptions.length, 1.5));
      
      // Get the setting - try both possible locations
      const questionSetting = question.setting || (question._doc && question._doc.setting) || {
        totalCredits: 100,
        version: 1,
        questionType: 'qv'
      };
      
      // Convert backend question format to form format
      const formattedQuestion: QSQuestion = {
        _id: questionId,
        type: 'qv',
        question: questionText,
        description: questionDesc,
        setting: {
          ...questionSetting,
          questionType: 'qv',
          version: questionSetting.version || 1,
          sampleOption: questionSetting.sampleOption || 0
        },
        options: questionOptions
      };
      
      setQuestionFormData(formattedQuestion);
    } else if (questionType === 'likert') {
      // Get Likert-specific fields
      const scale = Array.isArray(question.scale) ? question.scale : ['1', '2', '3', '4', '5'];
      const minLabel = question.minLabel || 'Strongly Disagree';
      const maxLabel = question.maxLabel || 'Strongly Agree';
      
      const formattedQuestion: LikertQuestion = {
        _id: questionId,
        type: 'likert',
        question: questionText,
        description: questionDesc,
        scale,
        minLabel,
        maxLabel
      };
      
      setQuestionFormData(formattedQuestion);
    } else if (questionType === 'text') {
      // Get Text-specific fields
      const multiline =
        question.multiline === true ||
        (!!question._doc && question._doc.multiline === true);
      const maxLength =
        typeof question.maxLength === 'number'
          ? question.maxLength
          : question._doc && typeof question._doc.maxLength === 'number'
          ? question._doc.maxLength
          : undefined;
      const groupId =
        question.groupId ||
        (question._doc && question._doc.groupId) ||
        undefined;
      
      const formattedQuestion: TextQuestion = {
        _id: questionId,
        type: 'text',
        question: questionText,
        description: questionDesc,
        multiline,
        maxLength,
        groupId
      };
      
      setQuestionFormData(formattedQuestion);
    } else if (questionType === 'approval') {
      const options = Array.isArray(question.options)
        ? question.options
        : (question._doc && Array.isArray(question._doc.options) ? question._doc.options : []);
      const randomize =
        question.randomizeOptions === false ||
        (question._doc && question._doc.randomizeOptions === false)
          ? false
          : true;

      const formattedQuestion: ApprovalQuestion = {
        _id: questionId,
        type: 'approval',
        question: questionText,
        description: questionDesc,
        options,
        randomizeOptions: randomize,
      };
      setQuestionFormData(formattedQuestion);
    }
    
    // No need to log questionFormData here as it hasn't been updated yet
    // The state update is asynchronous, so logging here would show the old value
    setShowQuestionForm(true);
  };
  
  const resetForm = () => {
    setQuestionType('qv');
    setQuestionFormData(createDefaultQvQuestion());
    setEditingQuestionId(null);
    setShowQuestionForm(false);
    setError(null);
  };
  
  // Survey settings handlers
  const handleSurveySettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSurveySettings({
      ...surveySettings,
      [name]: value
    });
  };
  
  const handleSettingsCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setSurveySettings({
      ...surveySettings,
      [name]: checked
    });
  };
  
  const saveSurveySettings = async () => {
    if (!survey) return;
    
    try {
      const response = await fetch(`${API_PREFIX}/protected/surveys/${surveyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          title: surveySettings.title,
          description: surveySettings.description,
          settings: {
            hasSKey: surveySettings.hasSKey,
            sKeyValue: surveySettings.sKeyValue,
            hasUKey: surveySettings.hasUKey,
            isAvailable: surveySettings.isAvailable
          }
        })
      });
      
      if (response.ok) {
        const newToken = response.headers.get('X-New-Access-Token');
        if (newToken) {
          dispatch(loginSuccess({ token: newToken }));
        }
        await fetchSurvey();
        setEditingSurveySettings(false);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update survey settings');
      }
    } catch (error) {
      console.error('Error updating survey settings:', error);
      setError('An unexpected error occurred');
    }
  };

  const addCollaboratorToList = (entry: Collaborator) => {
    setCollaborators((prev) => {
      const exists = prev.some(
        (c) =>
          c.userId === entry.userId ||
          c.email.toLowerCase() === entry.email.toLowerCase(),
      );
      if (exists) {
        return prev;
      }
      return [...prev, entry];
    });
  };

  const removeCollaboratorFromList = (userId: string) => {
    setCollaborators((prev) => prev.filter((c) => c.userId !== userId));
  };

  const lookupUserByEmail = async (email: string) => {
    if (!auth.token) return null;
    const response = await fetch(
      `${API_PREFIX}/protected/profiles/lookup?email=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      },
    );
    if (response.ok) {
      return response.json();
    }
    const errorData = await response.json().catch(() => ({}));
    const fallback = 'No account found for that email. Ask them to sign up, then try again.';
    return { error: errorData.message || fallback };
  };

  const processCollaboratorInput = async (rawValue: string) => {
    const tokens = rawValue
      .split(/[,\n\t]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    setCollabError(null);
    for (const token of tokens) {
      const lookup = await lookupUserByEmail(token);
      if (lookup && lookup.userId) {
        addCollaboratorToList({
          userId: lookup.userId,
          email: lookup.email,
          isSelf: lookup.userId === auth.user?.id,
        });
      } else if (lookup && lookup.error) {
        setCollabError(`${lookup.error} (${token})`);
      }
    }
    setCollaboratorInput('');
  };

  const handleCollaboratorKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    const delimiters = ['Enter', 'Tab'];
    if (delimiters.includes(e.key) || e.key === ',') {
      e.preventDefault();
      if (collaboratorInput.trim().length > 0) {
        await processCollaboratorInput(collaboratorInput);
      }
    }
  };

  const handleCollaboratorBlur = async () => {
    if (collaboratorInput.trim().length > 0) {
      await processCollaboratorInput(collaboratorInput);
    }
  };

  const handleCollaboratorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCollaboratorInput(e.target.value);
  };

  const saveCollaborators = async () => {
    if (!surveyId || !auth.token) return false;
    try {
      setCollabSaving(true);
      setCollabError(null);
      const collaboratorIds = collaborators.map((c) => c.userId);
      const response = await fetch(`${API_PREFIX}/protected/surveys/${surveyId}/collaborators`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ collaboratorIds }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setCollabError(errorData.message || 'Failed to save collaborators');
        return false;
      }
      const data = await response.json();
      const incoming: Collaborator[] = Array.isArray(data?.collaborators)
        ? data.collaborators.map((c: any) => ({
            userId: c.userId,
            email: c.email,
            isSelf: Boolean(c.isSelf),
          }))
        : [];
      setCollaborators(incoming);
      return true;
    } catch (err) {
      setCollabError('Failed to save collaborators');
      return false;
    } finally {
      setCollabSaving(false);
    }
  };

  const validateQuestionForm = () => {
    // Common validations for all question types
    if (!questionFormData.question.trim()) {
      setError('Question text is required');
      return false;
    }
    
    // Type-specific validations
    if (questionType === 'qv') {
      const qvQuestion = questionFormData as QSQuestion;
      
      if (qvQuestion.options.length < 2) {
        setError('QS questions must have at least 2 options');
        return false;
      }
      
      for (const option of qvQuestion.options) {
        if (!option.optionName.trim()) {
          setError('All options must have a name');
          return false;
        }
      }
      
      if (qvQuestion.setting.totalCredits <= 0) {
        setError('Total credits must be greater than 0');
        return false;
      }
    } else if (questionType === 'likert') {
      const likertQuestion = questionFormData as LikertQuestion;
      
      if (likertQuestion.scale.length < 2) {
        setError('Likert scale must have at least 2 points');
        return false;
      }
      
      if (!likertQuestion.minLabel || !likertQuestion.maxLabel) {
        setError('Scale labels are required');
        return false;
      }
    } else if (questionType === 'text') {
      const textQuestion = questionFormData as TextQuestion;
      
      if (textQuestion.maxLength && textQuestion.maxLength <= 0) {
        setError('Maximum length must be greater than 0');
        return false;
      }
    } else if (questionType === 'approval') {
      const approvalQuestion = questionFormData as ApprovalQuestion;
      if (!approvalQuestion.options || approvalQuestion.options.length < 1) {
        setError('Approval questions must have at least 1 option');
        return false;
      }
      for (const option of approvalQuestion.options) {
        if (!option.optionName.trim()) {
          setError('All options must have a label');
          return false;
        }
      }
    }
    
    setError(null);
    return true;
  };

  const saveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateQuestionForm()) {
      return;
    }
    
    try {
      setSavingQuestion(true);
      
      // Prepare data for the API based on question type
      let apiEndpoint = '';
      let apiData: any = {};
      
      switch (questionType) {
        case 'qv': {
          apiEndpoint = '/protected/questions/qv';
          const qvQuestion = questionFormData as QSQuestion;
          apiData = {
            ...qvQuestion,
            surveyId,
            type: 'qv'
          };
          break;
        }
        case 'likert': {
          apiEndpoint = '/protected/questions/likert';
          const likertQuestion = questionFormData as LikertQuestion;
          apiData = {
            ...likertQuestion,
            surveyId,
            type: 'likert'
          };
          break;
        }
        case 'text': {
          apiEndpoint = '/protected/questions/text';
          const textQuestion = questionFormData as TextQuestion;
          apiData = {
            ...textQuestion,
            surveyId,
            type: 'text'
          };
          break;
        }
        case 'approval': {
          apiEndpoint = '/protected/questions/approval';
          const approvalQuestion = questionFormData as ApprovalQuestion;
          apiData = {
            type: 'approval',
            surveyId,
            question: approvalQuestion.question,
            description: approvalQuestion.description,
            randomizeOptions:
              approvalQuestion.randomizeOptions === undefined
                ? true
                : approvalQuestion.randomizeOptions,
            options: approvalQuestion.options || []
          };
          break;
        }
      }
      
      // Add the _id to apiData if we're editing an existing question
      if (editingQuestionId) {
        apiData._id = editingQuestionId;
      }
      
      let response;
      
      if (editingQuestionId) {
        // Update existing question - use the appropriate endpoint based on question type
        const updateEndpoint =
          questionType === 'qv'
            ? `/protected/questions/qv/${editingQuestionId}`
            : questionType === 'likert'
            ? `/protected/questions/likert/${editingQuestionId}`
            : questionType === 'approval'
            ? `/protected/questions/approval/${editingQuestionId}`
            : `/protected/questions/text/${editingQuestionId}`;

        response = await fetch(`${API_PREFIX}${updateEndpoint}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.token}`
          },
          body: JSON.stringify(apiData)
        });
      } else {
        // Create new question - use the type-specific endpoint
        response = await fetch(`${API_PREFIX}${apiEndpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.token}`
          },
          body: JSON.stringify(apiData)
        });
      }
      
      if (response.ok) {
        const newToken = response.headers.get('X-New-Access-Token');
        if (newToken) {
          dispatch(loginSuccess({ token: newToken }));
        }
        await fetchSurvey(); // Refresh the survey data
        resetForm();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to save question');
      }
    } catch (error) {
      console.error('Error saving question:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSavingQuestion(false);
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_PREFIX}/protected/questions/${questionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          surveyId: survey?._id,
        }),
      });
      
      if (response.ok) {
        const newToken = response.headers.get('X-New-Access-Token');
        if (newToken) {
          dispatch(loginSuccess({ token: newToken }));
        }
        await fetchSurvey(); // Refresh the survey data
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete question');
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  if (loading) {
    return <div className="loading">Loading survey details...</div>;
  }

  if (error && !survey) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/designer')}>Back to Survey List</button>
      </div>
    );
  }

  const surveyTitle = survey?.title || 'Untitled survey';

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <AppShell
      appBarProps={{
        title: 'QSurvey System',
        breadcrumbs: [
          { label: 'Projects', onClick: () => navigate('/designer') },
          { label: `Edit ${surveyTitle}` },
        ],
        onTitleClick: () => navigate('/'),
        leading: (
          <button
            className="qs-top-app-bar__back"
            type="button"
            onClick={() => navigate('/designer')}
            aria-label="Back to projects"
          >
            <MdChevronLeft className="qs-top-app-bar__back-icon" />
          </button>
        ),
        actions: auth.isAuthenticated ? (
          <UserMenu email={auth.user?.email} onLogout={handleLogout} />
        ) : undefined,
      }}
    >
      <div className="survey-edit-container">
        <div className="survey-edit-content">
        <div className="survey-info">
          <div className="info-header">
            <div className="survey-info-main">
              <h2 className="survey-title">{survey?.title}</h2>
              {survey?.description && (
                <p className="survey-description">
                  {survey.description}
                </p>
              )}
              <div className="collaborators-section">
                <div className="collaborators-row">
                  <div className="collaborators-label">Collaborators:</div>
                  <div className="collaborators-pill-row">
                    {collaborators.map((collab) => (
                      <span
                        key={collab.userId}
                        className={`collaborator-pill ${collab.isSelf ? 'collaborator-pill-self' : ''}`}
                      >
                        {collab.email}
                        {collab.isSelf ? ' (you)' : ''}
                        {editingCollaborators && !collab.isSelf && (
                          <button
                            type="button"
                            className="pill-remove-btn"
                            onClick={() => removeCollaboratorFromList(collab.userId)}
                            disabled={collabSaving}
                            aria-label={`Remove ${collab.email}`}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  {editingCollaborators && (
                    <input
                      type="email"
                      className="collaborator-input"
                      placeholder="Add collaborator by email"
                      value={collaboratorInput}
                      onChange={handleCollaboratorInputChange}
                      onKeyDown={handleCollaboratorKeyDown}
                      onBlur={handleCollaboratorBlur}
                      disabled={collabSaving}
                      aria-label="Add collaborator email"
                    />
                  )}
                  <button
                    type="button"
                    className="edit-collaborators-btn"
                    disabled={collabSaving}
                    onClick={async () => {
                      if (collabSaving) {
                        return;
                      }
                      if (editingCollaborators) {
                        const saved = await saveCollaborators();
                        if (saved) {
                          setEditingCollaborators(false);
                        }
                        return;
                      }
                      setEditingCollaborators(true);
                    }}
                    aria-label="Edit collaborators"
                    title="Edit collaborators"
                  >
                    {editingCollaborators ? (collabSaving ? 'Saving...' : 'Save') : 'Edit'}
                  </button>
                </div>
                {collabLoading && <span className="collaborator-status">Loading collaborators…</span>}
                {collabError && <span className="collaborator-status">{collabError}</span>}
              </div>
            </div>
            <div className="header-actions">
              <button 
                className="preview-btn" 
                onClick={() => navigate(`/survey/${surveyId}`)}
              >
                Preview Survey
              </button>
              <button 
                className="edit-settings-btn"
                onClick={() => setEditingSurveySettings(!editingSurveySettings)}
              >
                {editingSurveySettings ? 'Cancel' : 'Edit Info'}
              </button>
            </div>
          </div>

          {!editingSurveySettings && survey && (
            <>
              <div className="survey-status-row">
                <div className="status-chips">
                  <span
                    className={
                      survey.settings.isAvailable
                        ? 'status-chip status-chip-live'
                        : 'status-chip status-chip-paused'
                    }
                  >
                    {survey.settings.isAvailable ? 'Live' : 'Not Live'}
                  </span>

                  <span
                    className={
                      survey.settings.hasSKey
                        ? 'status-chip status-chip-key-on'
                        : 'status-chip status-chip-key-off'
                    }
                  >
                    Survey Key
                  </span>

                  <span
                    className={
                      survey.settings.hasUKey
                        ? 'status-chip status-chip-key-on'
                        : 'status-chip status-chip-key-off'
                    }
                  >
                    Unique Key
                  </span>
                </div>
              </div>

              {survey.settings.hasSKey && (
                <div className="survey-settings-row">
                  <div className="survey-key-pill">
                    <span className="survey-key-label">Survey Key</span>
                    <span className="survey-key-value">
                      {survey.settings.sKeyValue || 'Not set'}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
          
          {editingSurveySettings ? (
            <div className="survey-settings-form">
              <div className="form-group">
                <label htmlFor="title">Survey Title:</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={surveySettings.title}
                  onChange={handleSurveySettingsChange}
                  placeholder="Survey title"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={surveySettings.description}
                  onChange={handleSurveySettingsChange}
                  placeholder="Survey description"
                />
              </div>
              
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="isAvailable"
                    checked={surveySettings.isAvailable}
                    onChange={handleSettingsCheckboxChange}
                  />
                  Make survey available
                </label>
              </div>
              
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="hasUKey"
                    checked={surveySettings.hasUKey}
                    onChange={handleSettingsCheckboxChange}
                  />
                  Require Unique Key (uKey) for responses
                </label>
                <p className="setting-help-text">
                  When enabled, each respondent needs a unique key to submit a response. This prevents multiple submissions from the same person.
                </p>
              </div>
              
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="hasSKey"
                    checked={surveySettings.hasSKey}
                    onChange={handleSettingsCheckboxChange}
                  />
                  Require Survey Key (sKey) for access
                </label>
                {surveySettings.hasSKey && (
                  <div className="form-group nested-input">
                    <label htmlFor="sKeyValue">Survey Key:</label>
                    <input
                      type="text"
                      id="sKeyValue"
                      name="sKeyValue"
                      value={surveySettings.sKeyValue}
                      onChange={handleSurveySettingsChange}
                      placeholder="Enter survey key"
                      required={surveySettings.hasSKey}
                    />
                  </div>
                )}
                <p className="setting-help-text">
                  When enabled, respondents need this key to access the survey. Useful for limiting access.
                </p>
              </div>
              
              <div className="settings-actions">
                <button type="button" className="cancel-btn" onClick={() => setEditingSurveySettings(false)}>
                  Cancel
                </button>
                <button type="button" className="save-settings-btn" onClick={saveSurveySettings}>
                  Save Settings
                </button>
              </div>
            </div>
          ) : null}
        </div>
        
        <div className="questions-section">
          <div className="questions-header">
            <h2>Survey Questions</h2>
            <div className="question-actions">
              {/* <button 
                className="add-group-btn"
                onClick={() => setShowGroupForm(!showGroupForm)}
              >
                {showGroupForm ? 'Cancel' : 'Add Question Group'}
              </button> */}
              <button
                className="add-question-btn"
                aria-label="Add question"
                onClick={handleAddQuestionClick}
              >
                Add New Question
              </button>
            </div>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          {showQuestionForm && (
            <div className="question-form">
              <div className="question-type-selector">
                <div className="question-type-row">
                  <div className="question-type-header">Select Question Type</div>
                  <div className="question-type-buttons">
                    <div className="question-type-group">
                      <button 
                        type="button" 
                        className={`type-btn ${questionType === 'qv' ? 'active' : ''}`}
                        onClick={() => handleQuestionTypeChange('qv')}
                      >
                        Quadratic Survey
                      </button>
                      <button 
                        type="button" 
                        className={`type-btn ${questionType === 'approval' ? 'active' : ''}`}
                        onClick={() => handleQuestionTypeChange('approval')}
                      >
                        Approval
                      </button>
                    </div>
                    <div className="question-type-divider" />
                    <div className="question-type-group">
                      <button 
                        type="button" 
                        className={`type-btn ${questionType === 'likert' ? 'active' : ''}`}
                        onClick={() => handleQuestionTypeChange('likert')}
                      >
                        Likert Scale
                      </button>
                      <button 
                        type="button" 
                        className={`type-btn ${questionType === 'text' ? 'active' : ''}`}
                        onClick={() => handleQuestionTypeChange('text')}
                      >
                        Text Input
                      </button>
                    </div>
                  </div>
                </div>
                <div className="type-info">
                  {questionType === 'text' && (
                    <small>Text questions can be assigned to question groups</small>
                  )}
                  {questionType === 'likert' && (
                    <small>Likert questions can be assigned to question groups</small>
                  )}
                  {questionType === 'approval' && (
                    <small>Approval questions let respondents approve/neutral/disapprove options</small>
                  )}
                </div>
              </div>
              
              <form onSubmit={saveQuestion}>
                <div className="question-main-section">
                  <div className="form-group">
                    <label htmlFor="question">Question Text:</label>
                    <input 
                      type="text" 
                      id="question" 
                      name="question" 
                      value={questionFormData.question}
                      onChange={handleQuestionInputChange}
                      placeholder="Enter a clear question"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="description">Description/Instructions:</label>
                    <textarea 
                      id="description" 
                      name="description" 
                      value={questionFormData.description}
                      onChange={handleQuestionInputChange}
                      placeholder="e.g., Select your preferred priority..."
                    />
                  </div>
                </div>

                {/* Question Group Selection - Only for Likert and Text questions */}
                {(questionType === 'likert' || questionType === 'text') && survey?.questionGroups && survey.questionGroups.length > 0 && (
                  <div className="form-group">
                    <label htmlFor="groupId">Assign to Group (Optional):</label>
                    <select
                      id="groupId"
                      name="groupId"
                      value={questionFormData.groupId || ''}
                      onChange={(e) => {
                        setQuestionFormData({
                          ...questionFormData,
                          groupId: e.target.value === '' ? undefined : e.target.value
                        });
                      }}
                    >
                      <option value="">-- No Group --</option>
                      {survey.questionGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Question type specific fields */}
                {questionType === 'qv' && (
                  <>
                    <div className="options-section">
                      <div className="options-header">
                        <h4>Quadratic Survey Options</h4>
                      </div>
                      
                      {(questionFormData as QSQuestion).options.map((option, index) => (
                        <div key={index} className="option-item">
                          <div className="option-header">
                            <span className="option-label">Option {index + 1}</span>
                            <button 
                              type="button" 
                              className="remove-option-btn"
                              aria-label="Remove option"
                              title="Remove option"
                              onClick={() => removeOption(index)}
                            >
                              &times;
                            </button>
                          </div>
                          
                          <div className="option-fields">
                            <div className="form-group">
                              <label htmlFor={`option-${index}-name`}>Option Name:</label>
                              <input 
                                type="text" 
                                id={`option-${index}-name`}
                                value={option.optionName}
                                onChange={(e) => handleOptionChange(index, 'optionName', e.target.value)}
                                required
                              />
                            </div>
                            
                            <div className="form-group">
                              <label htmlFor={`option-${index}-desc`}>Description:</label>
                              <textarea
                                id={`option-${index}-desc`}
                                value={option.description}
                                onChange={(e) => handleOptionChange(index, 'description', e.target.value)}
                                required
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="options-footer">
                        <button 
                          type="button" 
                          className="add-option-btn"
                          onClick={addOption}
                        >
                          Add Option
                        </button>
                      </div>
                    </div>

                    <div className="total-credits-section">
                      <h4 className="settings-section-title">Quadratic Survey Settings</h4>
                      <div className="total-credits-row">
                        <span className="total-credits-label">Total Credits</span>
                        <div className="total-credits-info-wrapper">
                          <button
                            type="button"
                            className="total-credits-info"
                            aria-label="How total credits are calculated"
                          >
                            i
                          </button>
                          <div className="total-credits-tooltip">
                            Based on the number of options, this is the total number of credits respondents can allocate.
                          </div>
                        </div>
                        <span className="total-credits-value">
                          {(questionFormData as QSQuestion).setting.totalCredits}
                        </span>
                      </div>
                    </div>
                  </>
                )}
                
                {questionType === 'likert' && (
                  <>
                    <div className="options-section">
                      <div className="options-header">
                        <h4>Scale Labels (left to right)</h4>
                      </div>
                      
                      <div className="scale-points">
                        {(questionFormData as LikertQuestion).scale.map((point, index) => {
                          const likertQuestion = questionFormData as LikertQuestion;
                          const total = likertQuestion.scale.length;
                          const isFirst = index === 0;
                          const isLast = index === total - 1;
                          const isCenter = total % 2 === 1 && index === Math.floor(total / 2);

                          let labelContent: React.ReactNode = 'Scale label';
                          if (isFirst) {
                            labelContent = (
                              <>
                                <strong>Left-most</strong> label
                              </>
                            );
                          } else if (isLast) {
                            labelContent = (
                              <>
                                <strong>Right-most</strong> label
                              </>
                            );
                          } else if (isCenter) {
                            labelContent = 'Center label (optional)';
                          }

                          return (
                            <div key={index} className="scale-point-item">
                              <div className="form-group">
                                <label htmlFor={`scale-${index}`}>{labelContent}</label>
                                <input 
                                  type="text" 
                                  id={`scale-${index}`}
                                  value={point}
                                  onChange={(e) => handleOptionChange(index, 'scale', e.target.value)}
                                  required={isFirst || isLast || isCenter}
                                />
                              </div>
                              
                              <button 
                                type="button" 
                                className="remove-option-btn"
                                aria-label="Remove scale point"
                                title="Remove scale point"
                                onClick={() => removeOption(index)}
                              >
                                &times;
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <div className="options-footer">
                        <button 
                          type="button" 
                          className="add-option-btn"
                          onClick={addOption}
                        >
                          Add Scale Point
                        </button>
                      </div>
                    </div>

                    <div className="likert-settings-section">
                      <h4 className="settings-section-title">Likert Scale Settings</h4>
                      <div className="likert-label-row">
                        <div className="form-group">
                          <label htmlFor="minLabel">Minimum Scale Label:</label>
                          <input 
                            type="text" 
                            id="minLabel" 
                            name="minLabel" 
                            value={(questionFormData as LikertQuestion).minLabel || ''}
                            onChange={handleSettingChange}
                            placeholder="e.g., Strongly Disagree"
                            required
                          />
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor="maxLabel">Maximum Scale Label:</label>
                          <input 
                            type="text" 
                            id="maxLabel" 
                            name="maxLabel" 
                            value={(questionFormData as LikertQuestion).maxLabel || ''}
                            onChange={handleSettingChange}
                            placeholder="e.g., Strongly Agree"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                {questionType === 'text' && (
                  <>
                      <div className="text-settings-section">
                      <h4 className="settings-section-title">Text Question Settings</h4>

                      <div className="text-setting-row">
                        <div className="text-setting-label">
                          <strong>Multi-line input</strong>
                          <br />
                          <span className="setting-help-text">
                            Enable this to encourage more detailed responses.
                          </span>
                        </div>
                        <label className="toggle text-setting-control">
                          <input
                            type="checkbox"
                            name="multiline"
                            aria-label="Allow multiple lines of text (paragraph)"
                            checked={(questionFormData as TextQuestion).multiline}
                            onChange={handleSettingChange}
                            className="toggle-input"
                          />
                          <span className="toggle-slider" />
                        </label>
                      </div>
                      
                      <div className="text-setting-row">
                        <div className="text-setting-label">
                          <strong>Character limit</strong>
                          <br />
                          <span className="setting-help-text">
                            Set the max number of characters for short answers (leave blank for no limit)
                          </span>
                        </div>
                      <div className="text-setting-control">
                        <label htmlFor="maxLength">Maximum Character Length:</label>
                        <input 
                          type="number" 
                          id="maxLength" 
                            name="maxLength" 
                            value={(questionFormData as TextQuestion).maxLength ?? ''}
                            onChange={handleSettingChange}
                            min="1"
                            placeholder={
                              (questionFormData as TextQuestion).multiline
                                ? 'e.g., 500'
                                : 'e.g., 600'
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                {questionType === 'approval' && (
                  <>
                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          name="randomizeOptions"
                          checked={(questionFormData as ApprovalQuestion).randomizeOptions !== false}
                          onChange={handleSettingChange}
                        />
                        Randomize options for respondents
                      </label>
                    </div>

                    <div className="options-section">
                      <div className="options-header">
                        <h4>Options</h4>
                      </div>
                      
                      {(questionFormData as ApprovalQuestion).options.map((option, index) => (
                        <div key={index} className="option-item">
                          <div className="option-header">
                            <span className="option-label">Option {index + 1}</span>
                            <button 
                              type="button" 
                              className="remove-option-btn"
                              aria-label="Remove option"
                              title="Remove option"
                              onClick={() => removeOption(index)}
                            >
                              &times;
                            </button>
                          </div>

                          <div className="option-fields">
                            <div className="form-group">
                              <label htmlFor={`option-${index}-name`}>Option Name:</label>
                              <input 
                                type="text" 
                                id={`option-${index}-name`}
                                value={option.optionName}
                                onChange={(e) => handleOptionChange(index, 'optionName', e.target.value)}
                                required
                              />
                            </div>
                            
                            <div className="form-group">
                              <label htmlFor={`option-${index}-desc`}>Description:</label>
                              <textarea 
                                id={`option-${index}-desc`}
                                value={option.description}
                                onChange={(e) => handleOptionChange(index, 'description', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="options-footer">
                        <button 
                          type="button" 
                          className="add-option-btn"
                          onClick={addOption}
                        >
                          Add Option
                        </button>
                      </div>
                    </div>
                  </>
                )}
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={resetForm}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="save-btn"
                    disabled={savingQuestion}
                  >
                    {savingQuestion ? 'Saving...' : editingQuestionId ? 'Update Question' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {survey?.questions && survey.questions.length > 0 ? (
            <div className="questions-list">
                {survey.questions.map((question, qIndex) => {
                const questionType = resolveQuestionType(question);
                return (
                  <div key={question._id || qIndex} className="question-item">
                  <div className="question-content">
                    <h3>{question.question}</h3>
                    <p>{question.description}</p>
                    {questionType === 'qv' ? (
                      <>
                        <p><strong>Total Credits:</strong> {
                          // Try different ways to access totalCredits
                          (question.setting && question.setting.totalCredits) || 
                          (question._doc && question._doc.setting && question._doc.setting.totalCredits) || 
                          'N/A'
                        }</p>
                        <p><strong>Type:</strong> Quadratic Survey</p>
                        
                        <div className="options-preview">
                          <h4>Options:</h4>
                          <ul>
                            {Array.isArray(question.options) && question.options.length > 0 ? (
                              question.options.map((option: any, index: number) => (
                                <li key={option.optionId || `option-${index}`}>
                                  <strong>{option.optionName}</strong> - {option.description}
                                </li>
                              ))
                            ) : (
                              <li>No options available</li>
                            )}
                          </ul>
                        </div>
                      </>
                    ) : questionType === 'likert' ? (
                      <>
                        <p><strong>Type:</strong> Likert Scale</p>
                        <p><strong>Min Label:</strong> {question.minLabel || 'None'}</p>
                        <p><strong>Max Label:</strong> {question.maxLabel || 'None'}</p>
                        
                        <div className="options-preview">
                          <h4>Scale Points:</h4>
                          <ul>
                            {Array.isArray(question.scale) && question.scale.length > 0 ? (
                              question.scale.map((point: string, index: number) => (
                                <li key={`scale-${index}`}>{point}</li>
                              ))
                            ) : (
                              <li>No scale points available</li>
                            )}
                          </ul>
                        </div>
                      </>
                    ) : questionType === 'text' ? (
                      <>
                        <p><strong>Type:</strong> Text Input</p>
                        <p><strong>Multiline:</strong> {question.multiline ? 'Yes' : 'No'}</p>
                        <p><strong>Max Length:</strong> {question.maxLength || question._doc?.maxLength || 'Unlimited'}</p>
                      </>
                    ) : questionType === 'approval' ? (
                      <>
                        <p><strong>Type:</strong> Approval</p>
                        <p><strong>Randomize Options:</strong> {question.randomizeOptions === false ? 'No' : 'Yes'}</p>
                        <div className="options-preview">
                          <h4>Options:</h4>
                          <ul>
                            {Array.isArray(question.options) && question.options.length > 0 ? (
                              question.options.map((option: any, index: number) => (
                                <li key={option.optionId || `option-${index}`}>
                                  <strong>{option.optionName}</strong>
                                  {option.description ? ` - ${option.description}` : ''}
                                </li>
                              ))
                            ) : (
                              <li>No options available</li>
                            )}
                          </ul>
                        </div>
                      </>
                    ) : (
                      <p><strong>Type:</strong> Unknown question type</p>
                    )}
                  </div>
                  
                  <div className="question-actions">
                    <button
                      className="results-btn"
                      onClick={() => {
                        if (question._id && survey?._id) {
                          navigate(`/designer/results/${survey._id}?questionId=${question._id}`);
                        }
                      }}
                      disabled={!question._id}
                    >
                      Results
                    </button>
                    <button 
                      className="edit-btn"
                      onClick={() => handleEditQuestion(question)}
                    >
                      Edit
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => question._id ? deleteQuestion(question._id) : null}
                      disabled={!question._id}
                    >
                      Delete
                    </button>
                  </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-questions">
              <p>This survey doesn't have any questions yet.</p>
              {!showQuestionForm && (
                <button
                  className="add-first-question-btn"
                  onClick={handleAddQuestionClick}
                >
                  Add Your First Question
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </AppShell>
  );
};

export default SurveyEdit;
