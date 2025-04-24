import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../app/store';
import { 
  clearAllOptionVotesByOptionKeys, 
  addOneVoteToAllOptionsByOptionKeys, 
  regroupAndOrderOptions,
  fetchSurveyResponseByUUID,
  submitInitialQuestionResponse,
  submitAdditionalQuestionResponse,
  updateQuestionResponse,
  completeSurveyResponse
} from '../../features/qsOptionsSlice';
import { IQsOption } from '../../types/coreTypes';
import { CustomButton } from '../Button/Button';
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import './Summary.css';

interface SummaryProps {
  currentView: string;
  totalCredits: number;
  currCost: number;
  optionList: { [key: string]: IQsOption };
}

const ResetSurvey = ({ optionList }: { optionList: { [key: string]: IQsOption } }) => {
  const dispatch = useDispatch<AppDispatch>();

  const resetSurvey = () => {
    // console.log(Object.keys(optionList));
    dispatch(clearAllOptionVotesByOptionKeys({ optionKeys: Object.keys(optionList) }))
  };

  return (
    <CustomButton className={"reset"} label="Reset" onClick={resetSurvey} />
  );
};

const AddOneVoteEachOption = ({ totalCredits, currCost, optionList }: SummaryProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const addOneVoteEachOption = () => {
    var totalCreditsNeed = 0
    const sumTotalCreditsNeed = () => {
      // Sum the votes for all options in the optionList
      totalCreditsNeed = Object.values(optionList).reduce((acc, option) => acc + (option.votes + 1) * (option.votes + 1), 0);
      // console.log("totalCreditsNeed = ", totalCreditsNeed)
    };
    if (totalCreditsNeed <= (totalCredits - currCost)) {
      dispatch(addOneVoteToAllOptionsByOptionKeys({ optionKeys: Object.keys(optionList) }))
    }
  };

  return (
    <CustomButton className={"addOneVote"} label="All +1 Vote" onClick={addOneVoteEachOption} />
  );
};

export const Summary = ({ totalCredits, currCost, optionList }: SummaryProps) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const state = useSelector((state: any) => state);
  const qsOptions = useSelector((state: any) => state.qsOptions);
  const metadata = useSelector((state: any) => state.metadata);
  const questions = useSelector((state: any) => state.questions);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reorderSurvey = () => {
    dispatch(regroupAndOrderOptions({ curCategory: "all" }));
  };
  
  let remainingCredit = totalCredits - currCost;

  useEffect(() => {
    // Check if the remaining credit is positive and toggle the color of the submit button and color of credit
    const remainingCreditEl = document.getElementById("remainingCredit");
    if (remainingCredit > 0) {
      if (remainingCreditEl) {
        remainingCreditEl.style.color = "black";
      }
    } else {
      if (remainingCreditEl) {
        remainingCreditEl.style.color = "red";
      }
    }
  }, [remainingCredit]);

  const prepareQVResponse = () => {
    // Extract votes from the state
    const votes = Object.values(optionList).map(option => ({
      optionId: option.optionId,
      optionName: option.optionName,
      votes: option.votes
    }));

    // Create position data
    const positions: { [key: string]: number } = {};
    Object.values(optionList).forEach(option => {
      positions[option.optionId] = option.position || 0;
    });

    // Create group data
    const groups: { [key: string]: string } = {};
    Object.values(optionList).forEach(option => {
      groups[option.optionId] = option.group;
    });

    return {
      votes,
      position: positions,
      group: groups
    };
  };
  
  const extractBehavioralMetadata = () => {
    // Get tracking data from localStorage
    const eventRecordsJson = localStorage.getItem("eventRecords");
    const eventRecords = eventRecordsJson ? JSON.parse(eventRecordsJson) : null;
    
    // Extract relevant information from the Redux state
    const stateMetadata = {
      finalVotes: Object.values(optionList).map(option => ({
        optionId: option.optionId,
        optionName: option.optionName,
        votes: option.votes,
        group: option.group,
        position: option.position
      })),
      remainingCredits: remainingCredit,
      totalCredits: totalCredits,
      spentCredits: currCost,
      categories: state.qsOptions.categorySequence.currentViewCategories,
      timestamp: new Date().toISOString()
    };
    
    return {
      eventRecords,
      stateMetadata
    };
  };

  const handleSubmit = async () => {
    if (remainingCredit < 0) {
      setError("You don't have enough credits. Please reduce some votes.");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Get the current question (assuming position 0)
      const question: any = Object.values(questions.byId || {}).find((q: any) => q?.position === 0);
      if (!question || !question.questionId) throw new Error("No question found or questionId missing");

      // Prepare QV response content
      const responseContent = prepareQVResponse();

      // Get behavioral metadata
      const behavioralMetadata = extractBehavioralMetadata();
      
      // Get metadata
      const surveyId = metadata.surveyId;
      if (!surveyId) throw new Error("Survey ID is missing");
      
      console.log("Submitting survey response for surveyId:", surveyId);
      
      // If resumeUuid is provided, attempt to fetch the existing response
      if (metadata.resumeUuid && !qsOptions.responseStatus?.surveyResponseId) {
        console.log("Attempting to resume with UUID:", metadata.resumeUuid);
        try {
          // Attempt to fetch the existing survey response
          const resumePayload: {
            uuid: string;
            surveyId: string;
            sKey?: string;
            uKey?: string;
          } = {
            uuid: metadata.resumeUuid,
            surveyId
          };
          
          // Include keys if they are provided
          if (metadata.sKey) resumePayload.sKey = metadata.sKey;
          if (metadata.uKey) resumePayload.uKey = metadata.uKey;
          
          const result = await dispatch(fetchSurveyResponseByUUID(resumePayload));
          console.log("Resume result:", result);
          
          // Check for rejected state
          if (result.type.endsWith('/rejected')) {
            throw new Error((result.payload as any)?.message || "Failed to resume session");
          }
        } catch (err) {
          console.error("Failed to resume session:", err);
          setError("Failed to resume previous session. Starting a new response.");
        }
      }
      
      // For a single-question survey, we need to handle sequential operations:
      // 1. First submit the question response to get a UUID from the backend
      // 2. Then use that UUID to complete the survey
      let currentResponseStatus;
      
      // First step: submit the question response
      if (!qsOptions.responseStatus?.surveyResponseId) {
        console.log("Creating new survey response (first-time submission)");
        // First submission - create the survey response
        const initialSubmissionPayload: {
          IsNewSurveyResponse: boolean;
          surveyId: string;
          questionId: string;
          responseContent: any;
          sKey?: string;
          uKey?: string;
        } = {
          IsNewSurveyResponse: true,
          surveyId,
          questionId: question.questionId,
          responseContent
        };
        
        // Only include keys if they are defined
        if (metadata.sKey) initialSubmissionPayload.sKey = metadata.sKey;
        if (metadata.uKey) initialSubmissionPayload.uKey = metadata.uKey;
        
        const result = await dispatch(submitInitialQuestionResponse(initialSubmissionPayload));
        console.log("Initial submission result:", result);
        
        // Check for rejected state
        if (result.type.endsWith('/rejected')) {
          throw new Error((result.payload as any)?.message || "Failed to submit initial response");
        }
        
        // Store the response data we need for the completion step
        if (result.payload && result.payload.surveyResponse) {
          currentResponseStatus = {
            surveyResponseId: result.payload.surveyResponse._id,
            uuid: result.payload.surveyResponse.uuid
          };
          console.log("Got surveyResponseId and UUID from initial submission:", currentResponseStatus);
        } else {
          console.error("Missing expected response data from initial submission:", result.payload);
          throw new Error("Failed to get survey response ID and UUID from initial submission");
        }
      } else if (qsOptions.responseStatus.questionResponseIds[question.questionId]) {
        console.log("Updating existing question response");
        // Update existing response
        // Ensure UUID is a string as required by the API
        if (!qsOptions.responseStatus.uuid) {
          throw new Error("UUID is missing for update operation");
        }
        
        const updatePayload: {
          uuid: string;
          surveyResponseId: string;
          questionResponseId: string;
          surveyId: string;
          questionId: string;
          responseContent: any;
          sKey?: string;
          uKey?: string;
        } = {
          uuid: qsOptions.responseStatus.uuid,
          surveyResponseId: qsOptions.responseStatus.surveyResponseId,
          questionResponseId: qsOptions.responseStatus.questionResponseIds[question.questionId],
          surveyId,
          questionId: question.questionId,
          responseContent
        };
        
        // Only include keys if they are defined
        if (metadata.sKey) updatePayload.sKey = metadata.sKey;
        if (metadata.uKey) updatePayload.uKey = metadata.uKey;
        
        const result = await dispatch(updateQuestionResponse(updatePayload));
        console.log("Update result:", result);
        
        // Check for rejected state
        if (result.type.endsWith('/rejected')) {
          throw new Error((result.payload as any)?.message || "Failed to update response");
        }
        
        currentResponseStatus = {
          surveyResponseId: qsOptions.responseStatus.surveyResponseId,
          uuid: qsOptions.responseStatus.uuid
        };
      } else {
        console.log("Adding new question response to existing survey");
        // Add a new question response to an existing survey response
        // Ensure UUID is a string as required by the API
        if (!qsOptions.responseStatus.uuid) {
          throw new Error("UUID is missing for additional question response");
        }
        
        const additionalPayload: {
          uuid: string;
          surveyResponseId: string;
          surveyId: string;
          questionId: string;
          responseContent: any;
          sKey?: string;
          uKey?: string;
        } = {
          uuid: qsOptions.responseStatus.uuid,
          surveyResponseId: qsOptions.responseStatus.surveyResponseId,
          surveyId,
          questionId: question.questionId,
          responseContent
        };
        
        // Only include keys if they are defined
        if (metadata.sKey) additionalPayload.sKey = metadata.sKey;
        if (metadata.uKey) additionalPayload.uKey = metadata.uKey;
        
        const result = await dispatch(submitAdditionalQuestionResponse(additionalPayload));
        console.log("Additional question result:", result);
        
        // Check for rejected state
        if (result.type.endsWith('/rejected')) {
          throw new Error((result.payload as any)?.message || "Failed to submit additional response");
        }
        
        currentResponseStatus = {
          surveyResponseId: qsOptions.responseStatus.surveyResponseId,
          uuid: qsOptions.responseStatus.uuid
        };
      }

      // Second step: Mark survey as complete using the UUID we just received
      console.log("Completing survey with response status:", currentResponseStatus);
      if (currentResponseStatus?.surveyResponseId && currentResponseStatus?.uuid) {
        console.log("Completing survey response");
        
        // Create a modified version of the behavioral metadata without the large eventRecords
        const trimmedMetadata = {
          stateMetadata: behavioralMetadata.stateMetadata,
          // Include only essential data from eventRecords to reduce payload size
          eventSummary: {
            totalEvents: behavioralMetadata.eventRecords ? behavioralMetadata.eventRecords.length : 0,
            lastEventTime: behavioralMetadata.eventRecords && behavioralMetadata.eventRecords.length > 0 
              ? behavioralMetadata.eventRecords[behavioralMetadata.eventRecords.length - 1].timestamp 
              : new Date().toISOString()
          }
        };
        
        const completePayload: {
          uuid: string;
          surveyResponseId: string;
          surveyId: string;
          metadata?: any;
          sKey?: string;
          uKey?: string;
        } = {
          uuid: currentResponseStatus.uuid,
          surveyResponseId: currentResponseStatus.surveyResponseId,
          surveyId,
          metadata: trimmedMetadata
        };
        
        // Only include keys if they are defined
        if (metadata.sKey) completePayload.sKey = metadata.sKey;
        if (metadata.uKey) completePayload.uKey = metadata.uKey;
        
        console.log("Sending completion payload:", completePayload);
        
        const result = await dispatch(completeSurveyResponse(completePayload));
        console.log("Complete survey result:", result);
        
        // Check for rejected state
        if (result.type.endsWith('/rejected')) {
          throw new Error((result.payload as any)?.message || "Failed to complete survey");
        }
      } else {
        throw new Error("No survey response ID or UUID available for completion");
      }

      // Still save local files for backward compatibility
      handleDownloadState();
      handleDownloadEventRecords();
      
      console.log("Survey submitted successfully!");
      // Navigate to the survey complete page
      navigate(`/survey/${id}/complete`);
    } catch (err: any) {
      console.error("Error submitting survey:", err);
      setError(err.message || "Failed to submit survey. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadState = () => {
    const stateJson = JSON.stringify(state, null, 2);
    const blob = new Blob([stateJson], { type: "text/plain;charset=utf-8" });
    const anchor = document.createElement("a");
    const dateTime = new Date().toISOString().replace(/:/g, "-");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `${dateTime}-state.txt`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    localStorage.removeItem("state");
  };

  const handleDownloadEventRecords = () => {
    const eventRecordsJson = localStorage.getItem("eventRecords");
    if (!eventRecordsJson) return;
    const blob = new Blob([eventRecordsJson], { type: "text/plain;charset=utf-8" });
    const anchor = document.createElement("a");
    const dateTime = new Date().toISOString().replace(/:/g, "-");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `${dateTime}-event.txt`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    localStorage.removeItem("eventRecords");
  };

  return (
    <div className="summary-box">
      <div className="summary-header">
        <h3>Credit Summary</h3>
      </div>
      <div className="summary-content top">
        <span className="summary-left">Remaining Credit</span>
        <span className="summary-right" id="remainingCredit">${totalCredits - currCost}</span>
      </div>
      {remainingCredit < 0 && (<div className='summary-hint-message'> Credit not sufficient. <br/> Please reduce some votes to submit.</div>)}
      {error && (<div className='summary-hint-message error'>{error}</div>)}
      <div className="summary-footer">
        <div>
          <CustomButton 
            className={`submit ${remainingCredit >= 0 ? 'valid' : 'invalid'} ${isSubmitting ? 'disabled' : ''}`} 
            label={isSubmitting ? "Submitting..." : "Submit"} 
            onClick={handleSubmit}
            disabled={isSubmitting} 
          />
        </div>
      </div>
    </div>
  );
};