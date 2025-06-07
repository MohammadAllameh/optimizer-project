
export interface ProjectFile {
  id: string; // Unique ID for each file
  name: string;
  content: string;
  originalContent: string; // To store the initial content
  language: string;
  isModified?: boolean; // Flag to track if the file has been changed
}

export enum TaskId {
  ANALYZE_IMPROVE = 'ANALYZE_IMPROVE',
  GENERATE_TESTS = 'GENERATE_TESTS',
  PROJECT_SUMMARY = 'PROJECT_SUMMARY',
  PROJECT_ANALYZE_TARGETS = 'PROJECT_ANALYZE_TARGETS',
}

export type TaskType = TaskId;

export interface AISuggestion {
  explanation: string;
  searchBlock?: string;
  replaceBlock?: string;
}

export interface ProjectTarget {
  id: string; // Unique ID for the target
  fileName: string;
  areaDescription: string; // e.g., "function processData", "class Calculator"
  aiSuggestion: string; // AI's brief suggestion for this target
  recommendedTaskId: TaskId; // Task to execute on this target (e.g., ANALYZE_IMPROVE)
}

export enum WorkflowStep {
  INIT = 'INIT', // Initial state, ready to load project
  PROJECT_LOADED = 'PROJECT_LOADED', // Project files loaded, ready for summary
  SUMMARY_GENERATING = 'SUMMARY_GENERATING',
  SUMMARY_DISPLAYED = 'SUMMARY_DISPLAYED', // Summary shown, ready for analysis
  ANALYSIS_GENERATING_TARGETS = 'ANALYSIS_GENERATING_TARGETS',
  TARGETS_DISPLAYED = 'TARGETS_DISPLAYED', // Analysis targets shown, ready for target selection
  TARGET_PROCESSING = 'TARGET_PROCESSING', // Processing a selected target
  TARGET_PROCESSED_SHOWING_SUGGESTIONS = 'TARGET_PROCESSED_SHOWING_SUGGESTIONS', // Suggestions for target shown
  MODIFICATIONS_APPLIED = 'MODIFICATIONS_APPLIED', // Changes applied, ready for output/download
}
