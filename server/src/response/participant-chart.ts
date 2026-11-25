import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';

interface ChartPage {
  cursor?: string;
  completedBy: string;
}

/** The chart identity groups one participant's answers to one question. */
export class ParticipantChart {
  private readonly identityKey: Buffer;
  private readonly cursorKey: Buffer;
  private readonly cursorScope: Buffer;

  constructor(secret: string, surveyId: string, questionId: string, sKey?: string) {
    if (!secret) throw new InternalServerErrorException('Results key is unavailable');
    const derive = (purpose: string) => createHmac('sha256', secret)
      .update(JSON.stringify(['qsurvey.participant-chart.v1', purpose, surveyId, questionId]))
      .digest();
    this.identityKey = derive('respondent');
    this.cursorKey = derive('cursor');
    this.cursorScope = Buffer.from(JSON.stringify([sKey || null]));
  }

  respondentId(responseId: string): string {
    if (!responseId) throw new InternalServerErrorException('Missing response identity');
    return 'chart-' + createHmac('sha256', this.identityKey).update(responseId).digest('base64url');
  }

  startPage(token?: string): ChartPage {
    if (token === undefined) return { completedBy: new Date().toISOString() };
    try {
      if (!/^[\w-]{39,1024}$/.test(token)) throw new Error();
      const data = Buffer.from(token, 'base64url');
      if (data.toString('base64url') !== token) throw new Error();
      const decipher = createDecipheriv('aes-256-gcm', this.cursorKey, data.subarray(0, 12));
      decipher.setAAD(this.cursorScope);
      decipher.setAuthTag(data.subarray(12, 28));
      const plain = Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]);
      return JSON.parse(plain.toString('utf8')) as ChartPage;
    } catch {
      throw new BadRequestException('cursor is invalid');
    }
  }

  nextPage(cursor: string | null, completedBy: string): string | null {
    if (!cursor) return null;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.cursorKey, iv);
    cipher.setAAD(this.cursorScope);
    const plain = JSON.stringify({ cursor, completedBy });
    const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url');
  }
}
