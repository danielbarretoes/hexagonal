export interface ProblemDetailsRuntimeOptions {
  readonly baseUrl: string;
  readonly exposeUnexpectedDetails: boolean;
}

export const PROBLEM_DETAILS_RUNTIME_OPTIONS = Symbol('PROBLEM_DETAILS_RUNTIME_OPTIONS');
