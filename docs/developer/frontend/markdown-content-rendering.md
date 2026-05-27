Markdown Content Rendering
==========================

This document defines the contract for shared author-provided rich-text rendering
in the QV System. It records the current content surfaces, the allowed formats,
and the security rules that the implementation and migration tasks must preserve.

## Overview

The current frontend routes author-provided rich content through
`client/src/components/common/MarkdownRenderer.tsx`. The older
`client/src/components/common/HtmlContent.tsx` remains as a compatibility wrapper
for legacy HTML content. The backend survey-page DTO has already introduced
explicit `markdown` / `html` / `text` format values.

The renderer migration should replace ad hoc content handling with a shared
`MarkdownRenderer` contract while preserving a narrow rule:

- `markdown` is the default format for author-entered rich text.
- `html` is reserved for legacy or already-sanitized HTML-compatible content.
- `text` renders escaped plain text safely.

## Key Files

- `client/src/components/common/MarkdownRenderer.tsx` - Shared renderer and
  sanitizer for Markdown, legacy HTML, and plain-text content.
- `client/src/components/common/HtmlContent.tsx` - Compatibility wrapper that
  renders legacy HTML through `MarkdownRenderer`.
- `client/src/components/QuestionInfo/questionPrompt.tsx` - Renders question
  descriptions via `MarkdownRenderer` in default Markdown mode.
- `client/src/pages/survey/components/MultiQuestionSurveyPage.tsx` - Renders
  `text_block` question content via `MarkdownRenderer` in default Markdown
  mode.
- `server/src/surveys/dtos/updateSurveyPages.dto.ts` - Declares the page-content
  format union: `markdown | html | text`.
- `server/src/surveys/dtos/updateSurveyPages.dto.spec.ts` - Validation coverage
  for accepted and rejected page-content formats.
- `docs/developer/frontend/survey-frontend.md` - Existing survey flow doc
  that currently describes text blocks as sanitized HTML.

## Current Surface Audit

### Question descriptions

File: `client/src/components/QuestionInfo/questionPrompt.tsx`

- `question.description` is rendered through `MarkdownRenderer`.
- Current behavior uses default Markdown mode.
- Raw safe HTML is preserved before sanitization, so legacy HTML descriptions
  continue to render while Markdown syntax is supported.

### Survey text blocks

File: `client/src/pages/survey/components/MultiQuestionSurveyPage.tsx`

- `text_block` questions read `question.content` and pass it to
  `MarkdownRenderer`.
- Current behavior uses default Markdown mode.
- Raw safe HTML is preserved before sanitization, so legacy HTML text blocks
  continue to render while Markdown syntax is supported.

### Survey page DTO content

File: `server/src/surveys/dtos/updateSurveyPages.dto.ts`

- Page content entries already carry an explicit `format` field.
- Allowed backend values are `markdown`, `html`, and `text`.
- This DTO is the strongest current signal for the shared renderer API and
  should be treated as the canonical format vocabulary.

## Shared Renderer Contract

### Proposed component

- Name: `MarkdownRenderer`
- Proposed file: `client/src/components/common/MarkdownRenderer.tsx`

### Proposed props

- `content: string`
- `format?: 'markdown' | 'html' | 'text'`
- `className?: string`
- `allowImages?: boolean`

### Default behavior

- Default `format` is `markdown` for new author-entered rich text.
- `format="html"` is opt-in and reserved for legacy or explicitly trusted
  HTML-compatible content.
- `format="text"` escapes and preserves raw text safely, without interpreting
  markup.

## Allowed Content Policy

The shared renderer should support these author-facing structures:

- headings
- paragraphs
- emphasis and strong text
- inline code and fenced code blocks
- blockquotes
- ordered and unordered lists
- links
- line breaks
- horizontal rules

Images should be disabled by default and allowed only when the caller opts in
with `allowImages`.

The renderer must reject or strip:

- scripts
- inline event handlers
- iframes
- embedded objects
- unsafe URL protocols such as `javascript:`

## Security Invariants

- Author-provided content must flow through one shared renderer contract.
- After migration, consumers should not call `dangerouslySetInnerHTML` directly
  for author-provided survey content.
- `html` remains a compatibility format, not the default authoring path.
- URL handling must continue to reject unsafe protocols for links and images.
- If images are allowed, the decision must be explicit at the call site.

## Migration Guidance

1. Land the shared `MarkdownRenderer` component with sanitizer and format tests.
2. Migrate existing HTML consumers one by one rather than changing all call
   sites at once.
3. Use default Markdown mode for author-entered rich text where raw safe HTML
   must remain compatible.
4. Preserve legacy-only behavior by passing `format="html"` only where Markdown
   syntax must not be interpreted.
5. Keep plain-text-only surfaces on `format="text"` instead of using HTML.

## Caller Classification

- `QuestionPrompt`: default Markdown mode with safe raw HTML compatibility.
- `MultiQuestionSurveyPage` `text_block`: default Markdown mode with safe raw
  HTML compatibility.
- Survey page DTO `content[]`: already explicit; can support `markdown`, `html`,
  and `text` immediately at the API contract level.

## Open Decisions

- Whether survey text blocks should continue to accept legacy HTML long-term or
  eventually become Markdown-only authoring.
- Whether image rendering should ever be enabled by default for survey page
  content.
