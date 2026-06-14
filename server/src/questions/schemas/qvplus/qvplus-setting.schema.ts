import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { QVSetting } from '../qv/qv-setting.schema';
import { QVPlusRound, QVPlusRoundSchema } from './qvplus-round.schema';

// QVPlus extends the QV setting (inherits totalCredits / sampleOption / showInstructions / isAvailable / version)
// and adds an array of (vote, selection) rounds.
export type QVPlusSettingDocument = QVPlusSetting & Document;

@Schema()
export class QVPlusSetting extends QVSetting {
  @Prop({ type: [QVPlusRoundSchema], default: [] })
  rounds: QVPlusRound[];
}

export const QVPlusSettingSchema = SchemaFactory.createForClass(QVPlusSetting);
