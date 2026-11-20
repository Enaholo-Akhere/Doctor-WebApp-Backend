import type { AiChatTool } from './types';
import { getMyBookingTool } from './getMyBooking';
import { getBookingLinkTool } from './getBookingLink';
import { searchHealthKnowledgeTool } from './searchHealthKnowledge';

/** Tools the AI chat agent may call. */
export const AI_CHAT_TOOLS: AiChatTool[] = [searchHealthKnowledgeTool, getMyBookingTool, getBookingLinkTool];

export const aiChatToolByName = new Map(AI_CHAT_TOOLS.map((t) => [t.definition.name, t]));

export * from './types';
