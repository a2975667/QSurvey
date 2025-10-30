# Survey System Development Goal Sheet 📋

## Phase 1: Fix Immediate Response Submission Issues 🚨

### 1.1 Fix Missing Endpoint 
- [x] **Status**: Completed
- [x] **Backend**: Added `POST /api/v1/survey/responses/batch` endpoint building on existing survey response APIs
- [x] **Frontend**: Routed non-QV submission flow through the public `/api/v1/survey/responses/*` endpoints
- [x] **Example**: 
  ```
  Previous: POST /api/v1/response/64f123abc (404 Error)
  Current:  POST /api/v1/survey/responses/batch (200 OK)
  ```

### 1.2 Fix Data Format Mismatch
- [x] **Status**: Completed  
- [x] **Backend**: Created DTO support for batch non-QV submissions with nested response content
- [x] **Frontend**: Transform non-QV payloads into `{questionId, responseContent}` records before submission
- [x] **Example**:
  ```
  Previous: {surveyId: "123", responses: [{questionId: "456", selection: "5"}]}
  Current:  {surveyId: "123", responses: [{questionId: "456", responseContent: {selection: "5"}}]}
  ```

### 1.3 Add Proper Response Content Structure
- [x] **Status**: Completed
- [x] **Backend**: Normalized stored payloads for QV, likert, and text responses with type-specific DTO validation
- [x] **Frontend**: Submit likert selections and text answers using the normalized `responseContent` schema
- [x] **Example**:
  ```
  QV:    {votes: [...], position: {...}, group: {...}}
  Likert:{responseContent: {selection: "5", optionName: "Strongly Agree"}}
  Text:  {responseContent: {text: "Great service!"}}
  ```

---

## Phase 2: Unify Response Architecture 🏗️

### 2.1 Create Unified Redux State Management
- [~] **Status**: In Progress
- [x] **Frontend**: Created unified response slice scaffold with typed per-question state and submission queue
- [~] **Frontend**: Migrate QV responses to unified state (feature-flag path in place; multi-QV navigation + full parity pending)
- [x] **Frontend**: Wire non-QV components to unified state (replace local component state)
- [~] **Frontend**: Add resumable hydration from server UUID snapshot (UUID + vote hydration scaffolded; placement reconstruction outstanding)
- [ ] **Example**:
  ```typescript
  interface UnifiedResponseState {
    surveyId: string | null;
    questionResponses: {[questionId]: QuestionResponse};
    status: 'idle' | 'submitting' | 'completed';
  }
  ```

### 2.2 Implement Unified Submission Flow
- [~] **Status**: In Progress
- [x] **Frontend**: Create single submission function for non-QV question types (builder + Redux wiring)
- [ ] **Frontend**: Maintain QV multi-step process within unified flow (legacy pipeline still primary)
- [x] **Frontend**: Add proper non-QV batch processing with tests
- [ ] **Example**:
  ```
  submitUnifiedSurvey() {
    1. Validate all responses
    2. Create SurveyResponse
    3. Submit QV responses (multi-step)
    4. Submit non-QV responses (batch)
    5. Complete survey
  }
  ```

### 2.3 Add Resume Capability for Non-QV
- [~] **Status**: In Progress
- [x] **Frontend**: Store response state in Redux (unified slice now canonical store)
- [~] **Frontend**: Implement UUID-based resumption (fetch thunk + basic hydration; needs UI navigation + validation)
- [~] **Backend**: Support resuming non-QV responses (getter endpoint live; duplicate guards & validation pending)
- [ ] **Example**:
  ```
  User starts survey → Gets UUID → Saves progress → 
  Returns later → Resumes from saved state
  ```

---

## Phase 3: Enhance Multi-Question Support 📝

### 3.1 Enable Multiple QV Questions
- [~] **Status**: In Progress
- [x] **Frontend**: Mirror legacy QV operations into unified state (middleware + feature flag view models)
- [~] **Frontend**: Add question navigation for QV questions (navigator state + CTA wiring under flag; organizer/vote parity pending)
- [ ] **Backend**: Support multiple QV questions per survey
- [ ] **Example**:
  ```
  Survey with 2 QV questions:
  Q1: "Rate our service" (QV)
  Q2: "Rate our product" (QV)
  User completes Q1 → Navigate to Q2 → Complete survey
  ```

### 3.2 Create Unified Survey Taking Interface
- [ ] **Status**: Not Started
- [ ] **Frontend**: Create single component for mixed question types
- [ ] **Frontend**: Add question navigation and progress tracking
- [ ] **Frontend**: Handle question ordering and grouping
- [ ] **Example**:
  ```
  Survey with mixed questions:
  Q1: "Rate our service" (Likert)
  Q2: "Distribute credits" (QV)
  Q3: "Any comments?" (Text)
  Q4: "Rate our product" (Likert)
  ```

### 3.3 Update Survey Editor for Multi-Questions
- [ ] **Status**: Not Started
- [ ] **Frontend**: Enable all question types in survey editor
- [ ] **Frontend**: Add question ordering and grouping UI
- [ ] **Frontend**: Support question dependencies and logic
- [ ] **Example**:
  ```
  Survey Editor:
  [Add Question] → [QV] [Likert] [Text] (all enabled)
  [Question List] → Drag to reorder → Group questions
  ```

---

## Phase 4: Behavioral State Capture 🧠

### 4.1 Implement Likert Behavioral Tracking
- [ ] **Status**: Not Started
- [ ] **Frontend**: Track selection changes and timing
- [ ] **Frontend**: Capture hover events and interaction patterns
- [ ] **Backend**: Store behavioral metadata
- [ ] **Example**:
  ```
  Likert Question: "Rate our service 1-5"
  User hovers over 3 → clicks 4 → changes to 5
  Captures: [hover(3, 2s), click(4), change(4→5, 3s)]
  ```

### 4.2 Implement Text Response Behavioral Tracking
- [ ] **Status**: Not Started
- [ ] **Frontend**: Track keystrokes, edits, and time patterns
- [ ] **Frontend**: Capture copy-paste events and text changes
- [ ] **Backend**: Store text interaction metadata
- [ ] **Example**:
  ```
  Text Question: "Any comments?"
  User types "Good" → backspaces → types "Great service!"
  Captures: [type(4), backspace(1), type(13), totalTime(45s)]
  ```

### 4.3 Optimize QV Behavioral Data Storage
- [ ] **Status**: Not Started
- [ ] **Frontend**: Compress event records and metadata
- [ ] **Frontend**: Implement incremental submission
- [ ] **Backend**: Handle compressed behavioral data zich
- [ ] **Example**:
  ```
  QV Question with 50 interactions:
  Before: 2MB of event data
  After: 200KB compressed data
  ```

---

## Phase 5: Response Packet Size Management 📦

### 5.1 Implement Incremental Submission
- [ ] **Status**: Not Started
- [ ] **Frontend**: Submit after each question completion
- [ ] **Frontend**: Clear local state to manage memory
- [ ] **Backend**: Support checkpoint submissions
- [ ] **Example**:
  ```
  User completes Q1 → Submit to DB → Clear local state
  User completes Q2 → Submit to DB → Clear local state
  Continue until survey complete
  ```

### 5.2 Add Smart Compression
- [ ] **Status**: Not Started
- [ ] **Frontend**: Compress behavioral data intelligently
- [ ] **Frontend**: Keep essential data, aggregate details
- [ ] **Backend**: Handle compressed data efficiently
- [ ] **Example**:
  ```
  Event History: 100 events → 10 key transitions + summary
  Metadata: Raw data → Aggregated metrics
  Size: 1MB → 50KB
  ```

### 5.3 Implement Memory Management
- [ ] **Status**: Not Started
- [ ] **Frontend**: Use IndexedDB for persistent storage
- [ ] **Frontend**: Implement data cleanup strategies
- [ ] **Frontend**: Handle offline/online synchronization
- [ ] **Example**:
  ```
  Behavioral data → IndexedDB → Submit when online
  Local state → Clear after submission → Restore if needed
  ```

---

## Phase 6: Analytics and Insights 📊

### 6.1 Question-Level Cross-Survey Analysis
- [ ] **Status**: Not Started
- [ ] **Backend**: Create aggregation endpoints
- [ ] **Frontend**: Build question performance dashboard
- [ ] **Example**:
  ```
  "Rate our service" question used in 5 surveys:
  - Survey A: Avg 4.2/5
  - Survey B: Avg 3.8/5
  - Survey C: Avg 4.5/5
  ```

### 6.2 Respondent Journey Analysis
- [ ] **Status**: Not Started permitted
- [ ] **Backend**: Create respondent-level aggregation
- [ ] **Frontend**: Build individual response viewer
- [ ] **Example**:
  ```
  John's responses to Customer Satisfaction:
  - Service rating: 5/5
  - Product rating: 4/5
  - Likelihood to recommend: 5/5
  - Comments: "Great experience overall"
  ```

### 6.3 Survey-Level Aggregate Results
- [ ] **Status**: Not Started
- [ ] **Backend**: Create survey-level aggregation
- [ ] **Frontend**: Build survey results dashboard
- [ ] **Example**:
  ```
  Customer Satisfaction Survey Results:
  - 150 responses
  - Avg service rating: 4.3/5
  - 85% would recommend
  - Top feedback themes: "fast", "friendly", "helpful"
  ```

---

## Current System Status 📈

### Working Components ✅
- QV response submission (multi-step)
- QV behavioral state capture
- Survey creation and editing (QV only)
- Basic survey taking (QV only)

### Broken Components ❌
- Non-QV response submission (404 error)
- Multi-question surveys (only 1 QV question)
- Mixed question type surveys
- Non-QV state management

### Missing Components ⚠️
- Likert behavioral tracking
- Text response behavioral tracking
- Incremental submission system
- Response packet size management
- Cross-survey analytics
- Resume capability for non-QV

---

## Priority Order 🎯

1. **Phase 1** (Critical): Fix immediate submission issues
2. **Phase 2** (High): Unify response architecture  
3. **Phase 3** (High): Enable multi-question support
4. **Phase 4** (Medium): Add behavioral tracking
5. **Phase 5** (Medium): Optimize data management
6. **Phase 6** (Low): Build analytics features

---

## Notes 📝

### System Architecture
- **Survey** → Contains list of `surveyResponseId`s
- **SurveyResponse** → Contains list of `questionResponseId`s  
- **QuestionResponse** → Lowest level response (atomic)
- **Questions** → Reusable across multiple surveys

### Analysis Capabilities
- **Question-Level**: Find all responses to same questionId across surveys
- **Respondent-Level**: Find all responses for a surveyResponseId (one person's complete submission)
- **Survey-Level**: Aggregate all responses for a surveyId

### Current Challenges
- QV responses need behavioral state capture (complex events)
- Likert responses need change tracking (e.g., +2 → +4 changes)
- Response packets have size limits → need incremental submission
- Need to submit to DB at intervals (e.g., after each question)
