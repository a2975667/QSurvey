export type TelemetryEventType =
  | 'voteChanged'
  | 'binChanged'
  | 'navigateQuestion'
  | 'hoverStart'
  | 'hoverEnd'
  | 'reorder';

export interface BaseEvent {
  t: TelemetryEventType;
  at: number;
  surveyId?: string | null;
  questionId?: string;
}

export interface VoteChangedEvent extends BaseEvent {
  t: 'voteChanged';
  optionId: string;
  from: number;
  to: number;
}

export interface BinChangedEvent extends BaseEvent {
  t: 'binChanged';
  optionId: string;
  fromGroup: string;
  toGroup: string;
  toIndex: number;
}

export interface NavigateQuestionEvent extends BaseEvent {
  t: 'navigateQuestion';
  toQuestionId: string | undefined;
}

export interface HoverEvent extends BaseEvent {
  t: 'hoverStart' | 'hoverEnd';
  optionId: string;
  group?: string;
  index?: number;
}

export interface ReorderEvent extends BaseEvent {
  t: 'reorder';
}

export type TelemetryEvent =
  | VoteChangedEvent
  | BinChangedEvent
  | NavigateQuestionEvent
  | HoverEvent
  | ReorderEvent;

export interface TelemetrySummary {
  totalEvents: number;
  lastEventTime?: number;
  byType: Record<TelemetryEventType, number>;
}

