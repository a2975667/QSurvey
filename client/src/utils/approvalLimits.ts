type ApprovalLimitInput = {
  optionCount: number;
  maxApprovals?: unknown;
  unlimitedApprovals?: unknown;
};

const toSafeOptionCount = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

const toPositiveInteger = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const normalized = Math.floor(value);
  return normalized >= 1 ? normalized : undefined;
};

export const computeDefaultApprovalK = (optionCount: number): number => {
  const normalizedCount = toSafeOptionCount(optionCount);
  return Math.max(3, Math.ceil(normalizedCount / 4));
};

export const resolveEffectiveApprovalLimit = (
  input: ApprovalLimitInput,
): number | null => {
  if (input.unlimitedApprovals === true) {
    return null;
  }

  const explicitMax = toPositiveInteger(input.maxApprovals);
  if (explicitMax !== undefined) {
    return explicitMax;
  }

  return computeDefaultApprovalK(input.optionCount);
};

