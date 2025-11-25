import type { DetailedAuditTrace } from '@domain/audit';
import type { ZodIssue } from 'zod';

export interface ValidationIssue {
  path: string;
  message: string;
  code?: string;
}

export interface EngineSuccess<T> {
  ok: true;
  data: T;
  auditTrace: DetailedAuditTrace[];
  warnings: string[];
}

export interface EngineFailure<TCode extends string = string> {
  ok: false;
  error: {
    code: TCode;
    message: string;
    issues?: ValidationIssue[];
    details?: Record<string, unknown>;
  };
  auditTrace: DetailedAuditTrace[];
}

export type EngineResult<T, TCode extends string = string> =
  | EngineSuccess<T>
  | EngineFailure<TCode>;

export interface EngineFailureOptions {
  issues?: ValidationIssue[];
  details?: Record<string, unknown>;
  auditTrace?: DetailedAuditTrace[];
}

export function engineSuccess<T>(
  data: T,
  auditTrace: DetailedAuditTrace[] = [],
  warnings: string[] = []
): EngineSuccess<T> {
  return {
    ok: true,
    data,
    auditTrace,
    warnings,
  };
}

export function engineFailure<TCode extends string>(
  code: TCode,
  message: string,
  options: EngineFailureOptions = {}
): EngineFailure<TCode> {
  return {
    ok: false,
    error: {
      code,
      message,
      issues: options.issues,
      details: options.details,
    },
    auditTrace: options.auditTrace ?? [],
  };
}

export function mapZodIssues(issues: ZodIssue[] | undefined): ValidationIssue[] | undefined {
  if (!issues || issues.length === 0) {
    return undefined;
  }

  return issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
}

