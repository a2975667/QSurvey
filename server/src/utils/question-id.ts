import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

export function normalizeQuestionId(value: unknown): Types.ObjectId {
  const ref = value as { $oid?: unknown; _id?: unknown } | undefined;
  const id = ref?.$oid ?? ref?._id ?? value;
  if (id instanceof Types.ObjectId) return id;
  if (typeof id === 'string' && /^[a-f\d]{24}$/i.test(id)) return new Types.ObjectId(id);
  throw new BadRequestException('questionId is invalid');
}
