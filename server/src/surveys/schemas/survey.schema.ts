import { SurveySettings } from './surveySettings.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SurveyDocument = Survey & Document;

@Schema()
export class Survey {
  @Prop()
  title: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  description: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Question' }], default: [] })
  questions: Types.ObjectId[];

  @Prop({ type: [String], default: [] })
  responses: string[];

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'User' }],
    default: [],
    validate: {
      validator: function (v: Types.ObjectId[]) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'At least one collaborator is required',
    },
  })
  collaborators: Types.ObjectId[];

  @Prop()
  settings: SurveySettings;
}

export const SurveySchema = SchemaFactory.createForClass(Survey);
