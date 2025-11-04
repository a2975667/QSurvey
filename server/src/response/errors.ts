export const DUPLICATE_SUBMISSION_CODE = 'DUPLICATE_SUBMISSION';

export class DuplicateSubmissionError extends Error {
  readonly code = DUPLICATE_SUBMISSION_CODE;

  constructor(message = 'Duplicate submission detected') {
    super(message);
    this.name = 'DuplicateSubmissionError';
  }
}
