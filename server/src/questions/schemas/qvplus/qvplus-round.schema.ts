import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// A single radio choice within a followup question (shown as a dropdown option).
export type QVPlusChoiceDocument = QVPlusChoice & Document;

@Schema()
export class QVPlusChoice {
  @Prop()
  choiceId: string;

  @Prop()
  label: string;
}

export const QVPlusChoiceSchema = SchemaFactory.createForClass(QVPlusChoice);

// One followup question (prompt + list of choices) asked per option in a round's selection page.
export type QVPlusFollowupDocument = QVPlusFollowup & Document;

@Schema()
export class QVPlusFollowup {
  @Prop()
  followupId: string;

  @Prop()
  prompt: string;

  @Prop({ type: [QVPlusChoiceSchema], default: [] })
  choices: QVPlusChoice[];
}

export const QVPlusFollowupSchema = SchemaFactory.createForClass(QVPlusFollowup);

// One round = vote stage + selection stage. QVPlus can have 1+ rounds.
export type QVPlusRoundDocument = QVPlusRound & Document;

@Schema()
export class QVPlusRound {
  @Prop()
  roundId: string;

  @Prop()
  voteTitle?: string;

  @Prop()
  voteDescription?: string;

  @Prop()
  selectionTitle?: string;

  @Prop()
  selectionDescription?: string;

  // 'upvote' | 'downvote' | 'both' | 'none' — decides which options appear on this round's selection page.
  @Prop()
  requiredVoteFilter: string;

  @Prop({ type: [QVPlusFollowupSchema], default: [] })
  followupQuestions: QVPlusFollowup[];
}

export const QVPlusRoundSchema = SchemaFactory.createForClass(QVPlusRound);
