import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

export const OBJECT_ID_COLLATION = { locale: 'en', strength: 2 };

export function parseQuestionId(value: unknown): Types.ObjectId | undefined {
  const ref = value as { $oid?: unknown; _id?: unknown } | undefined;
  const id = ref?.$oid ?? ref?._id ?? value;
  if (id instanceof Types.ObjectId) return id;
  if (typeof id === 'string' && /^[a-f\d]{24}$/i.test(id)) return new Types.ObjectId(id);
}

export function normalizeQuestionId(value: unknown): Types.ObjectId {
  const id = parseQuestionId(value);
  if (!id) throw new BadRequestException('questionId is invalid');
  return id;
}
