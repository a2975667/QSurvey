import { HoverEvent } from './types';

export const hoverStart = (payload: Omit<HoverEvent, 't' | 'at'>) => ({
  type: 'telemetry/hoverStart',
  payload,
});

export const hoverEnd = (payload: Omit<HoverEvent, 't' | 'at'>) => ({
  type: 'telemetry/hoverEnd',
  payload,
});

