export enum IssueSeverity {
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
}

export interface HarperIssue {
  id: string;
  start: number;
  end: number;
  severity: IssueSeverity;
  message: string;
  suggestions: string[];
  context?: string;
}

export interface EditorPosition {
  line: number;
  col: number;
}
