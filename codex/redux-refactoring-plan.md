# Redux Refactoring Plan for QS-Centric Survey Platform

## Current Redux Structure Assessment

### Fragmentation Issues:

1. **Duplicate Code and Functionality**
   - There's significant duplication between `qsOptionsSlice.tsx` and the modular implementation in `options/slices/`. 
   - Many identical reducers appear in both files with similar functionality.

2. **Transition State**
   - The codebase is clearly in a transition from a monolithic approach to a more modular one, with both patterns coexisting.
   - The modern modular approach (`options.reducer.ts`) combines individual slice reducers, but the older approach still exists.

3. **API Duplication**
   - API calls are duplicated across slices (visible in `fetchSampleOptions`, `fetchMetaData`).
   - Comment on line 6 of `metadataSlice.tsx` confirms: "fetch call duplicated in three slices due to api returning all data in one call."

4. **Inconsistent State Management**
   - The same data (options) is managed in multiple places, creating potential synchronization issues.
   - Complex state nesting makes updates error-prone (e.g., updating nested fields in `positions` objects).

### Strengths of Current Approach:

1. **Domain Separation**
   - Clear separation between metadata, votes, positions, and responses.
   - The beginnings of a well-structured architecture in the newer modular files.

2. **Detailed State Tracking**
   - Comprehensive state management for options, positions, categories, etc.
   - Tracking of user interactions through the `metadata` slice.

## Recommendations for QS-Centric Reorganization

1. **Complete the Modularization**

   - Migrate all functionality to the modular pattern in `features/options/`:
     ```
     features/
       ├── survey/              # Survey metadata
       ├── questions/           # Question management
       ├── responses/           # User responses
       ├── voting/              # QS voting logic
         ├── api/               # API calls
         ├── slices/            # State slices
           ├── votes.slice.ts   # Vote counts
           ├── positions.slice.ts # Option positions
         ├── selectors/         # Memoized selectors
         ├── types/             # Type definitions
     ```

2. **Normalize State Structure**

   - Use Redux Toolkit's entity adapters to normalize data:
     ```typescript
     // Example normalized state structure
     const initialState = {
       surveys: {
         ids: ['survey1', 'survey2'],
         entities: {
           'survey1': { id: 'survey1', title: 'Survey 1', /* ... */ },
           'survey2': { id: 'survey2', title: 'Survey 2', /* ... */ }
         }
       },
       questions: {
         ids: ['q1', 'q2', 'q3'],
         entities: { /* ... */ }
       },
       options: {
         ids: ['opt1', 'opt2', 'opt3'],
         entities: { /* ... */ }
       },
       // Relationships
       questionsBysurvey: {
         'survey1': ['q1', 'q2'],
         'survey2': ['q3']
       },
       optionsByQuestion: {
         'q1': ['opt1', 'opt2'],
         'q2': ['opt3']
       }
     }
     ```

3. **Centralize API Interactions**

   - Create a dedicated API layer using RTK Query:
     ```typescript
     // Example RTK Query API
     const api = createApi({
       baseQuery: fetchBaseQuery({ baseUrl: API_PREFIX }),
       endpoints: (builder) => ({
         getSurvey: builder.query({
           query: (surveyKey) => `/surveys/${surveyKey}`,
           transformResponse: (response) => {
             // Normalize the response
             return {
               survey: { /* ... */ },
               questions: { /* ... */ },
               options: { /* ... */ }
             };
           }
         }),
         submitResponse: builder.mutation({
           query: (data) => ({
             url: `/response`,
             method: 'POST',
             body: data
           })
         })
       })
     });
     ```

4. **Create Specialized Slice Features**

   - **Survey Management**: Handle survey metadata, loading, and user session info
   - **Question Management**: Handle different question types (QV, Likert, Text)
   - **Response Handling**: Track, validate, and submit user responses
   - **QS Voting Logic**: Specialized logic for quadratic voting calculations
   - **Option Organization**: Categories, positions, drag-and-drop

5. **Improve Performance with Selectors**

   - Use memoized selectors to derive data:
     ```typescript
     const selectOptionsByCategory = createSelector(
       [selectOptions, selectCategories],
       (options, categories) => {
         const result = {};
         categories.forEach(category => {
           result[category] = options.filter(option => option.category === category);
         });
         return result;
       }
     );
     ```

6. **Add Middleware for QS-Specific Features**

   - Create custom middleware for vote validation, credit calculation, etc.
   - Implement automated analytics tracking for survey responses

## Implementation Strategy

1. **Phase 1: Consolidate Existing Code**
   - Complete the transition to the modular structure 
   - Remove duplicate code between old and new implementations
   - Create a proper normalized state structure

2. **Phase 2: Enhance QS Features**
   - Implement specialized QS voting calculations
   - Add QS-specific UI components tied to the Redux state
   - Create visualizations for vote distribution and allocation

3. **Phase 3: Add Advanced Features**
   - Implement survey templating and reuse
   - Add collaborative features if needed
   - Create analytics dashboards for survey results

This reorganization will create a more maintainable, performance-optimized Redux structure that directly supports the QS-centric survey platform goals, eliminating fragmentation while enhancing functionality.