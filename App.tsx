
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { FileUploadButton } from './components/FileUploadButton'; // Renamed for clarity
import { FileList } from './components/FileList';
import { CodeView } from './components/CodeView';
import { TaskPanel } from './components/TaskPanel'; // Will be adapted or replaced
import { LoadingIndicator } from './components/LoadingIndicator';
import { Button } from './components/Button';
import { ProjectFile, TaskType, TaskId, AISuggestion, ProjectTarget, WorkflowStep } from './types';
import { SAMPLE_PROJECT } from './constants';
import { getProjectSummary, getProjectAnalysisTargets, processFileTaskWithAI } from './services/geminiService';
import { parseAIDiff, applyParsedDiffs } from './utils/diffUtils';

// New components to be created
const ProjectSummaryView: React.FC<{ summary: string; onNext: () => void; isLoading: boolean }> = ({ summary, onNext, isLoading }) => (
  <div className="p-4 bg-slate-800 rounded-lg shadow-md flex-grow flex flex-col">
    <h3 className="text-xl font-semibold mb-3 text-sky-400">Project Summary</h3>
    <pre className="whitespace-pre-wrap text-slate-300 overflow-y-auto flex-grow bg-slate-900 p-3 rounded">{summary}</pre>
    <Button onClick={onNext} isLoading={isLoading} disabled={isLoading} className="mt-4 self-start">
      Analyze Project for Improvement Targets
    </Button>
  </div>
);

const ProjectAnalysisView: React.FC<{ targets: ProjectTarget[]; onSelectTarget: (targetId: string) => void; isLoading: boolean }> = ({ targets, onSelectTarget, isLoading }) => {
  if (isLoading) return <LoadingIndicator />;
  if (!targets || targets.length === 0) {
    return <p className="text-slate-400 p-4">No specific improvement targets identified by AI. You can try to select a file manually for actions.</p>;
  }
  return (
    <div className="p-4 bg-slate-800 rounded-lg shadow-md flex-grow flex flex-col">
      <h3 className="text-xl font-semibold mb-3 text-sky-400">Suggested Improvement Targets</h3>
      <ul className="space-y-2 overflow-y-auto flex-grow">
        {targets.map(target => (
          <li key={target.id} className="p-3 bg-slate-700 rounded hover:bg-slate-600 transition-colors cursor-pointer" onClick={() => onSelectTarget(target.id)}>
            <p className="font-semibold text-sky-300">{target.fileName} - <span className="text-amber-400">{target.areaDescription}</span></p>
            <p className="text-sm text-slate-300">{target.aiSuggestion}</p>
            <p className="text-xs text-slate-400 mt-1">Recommended: {target.recommendedTaskId === TaskId.ANALYZE_IMPROVE ? "Analyze & Improve" : "Generate Tests"}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};


const App: React.FC = () => {
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null); // Use ID
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [aiOutput, setAiOutput] = useState<string>(''); // For file-specific suggestions
  const [parsedSuggestions, setParsedSuggestions] = useState<AISuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showModified, setShowModified] = useState<boolean>(false);

  // New state for workflow
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>(WorkflowStep.INIT);
  const [projectSummary, setProjectSummary] = useState<string>('');
  const [analysisTargets, setAnalysisTargets] = useState<ProjectTarget[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<ProjectTarget | null>(null);

  const resetAppState = () => {
    setProjectFiles([]);
    setActiveFileId(null);
    setAiOutput('');
    setParsedSuggestions([]);
    setError(null);
    setShowModified(false);
    setWorkflowStep(WorkflowStep.INIT);
    setProjectSummary('');
    setAnalysisTargets([]);
    setSelectedTarget(null);
  };
  
  const handleLoadProject = useCallback(async () => {
    resetAppState(); // Reset everything before loading
    setIsLoading(true);
    setError(null);
    // Deep copy sample project to allow modifications
    const loadedFiles = SAMPLE_PROJECT.map(file => ({...file}));
    setProjectFiles(loadedFiles);
    setWorkflowStep(WorkflowStep.SUMMARY_GENERATING);
    try {
      const summary = await getProjectSummary(loadedFiles);
      setProjectSummary(summary);
      setWorkflowStep(WorkflowStep.SUMMARY_DISPLAYED);
    } catch (err) {
      console.error("Error getting project summary:", err);
      setError(err instanceof Error ? err.message : "Failed to get project summary.");
      setWorkflowStep(WorkflowStep.PROJECT_LOADED); // Fallback to allow manual file selection
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAnalyzeProject = useCallback(async () => {
    if (projectFiles.length === 0) return;
    setIsLoading(true);
    setError(null);
    setWorkflowStep(WorkflowStep.ANALYSIS_GENERATING_TARGETS);
    try {
      const targets = await getProjectAnalysisTargets(projectFiles);
      setAnalysisTargets(targets);
      setWorkflowStep(WorkflowStep.TARGETS_DISPLAYED);
    } catch (err) {
      console.error("Error getting project analysis targets:", err);
      setError(err instanceof Error ? err.message : "Failed to analyze project targets.");
      setWorkflowStep(WorkflowStep.SUMMARY_DISPLAYED); // Go back to summary
    } finally {
      setIsLoading(false);
    }
  }, [projectFiles]);

  const handleSelectTarget = useCallback((targetId: string) => {
    const target = analysisTargets.find(t => t.id === targetId);
    if (target) {
      setSelectedTarget(target);
      const fileToProcess = projectFiles.find(f => f.name === target.fileName);
      if (fileToProcess) {
        setActiveFileId(fileToProcess.id);
        setWorkflowStep(WorkflowStep.TARGET_PROCESSING);
        // Automatically trigger processing for the selected target
        handleTaskExecute(target.recommendedTaskId, fileToProcess.id);
      } else {
        setError(`File ${target.fileName} not found in project for selected target.`);
      }
    }
  }, [analysisTargets, projectFiles]);


  const handleFileSelect = useCallback((fileId: string) => {
    // This is now for manual file selection if user bypasses targets or after target processing
    setActiveFileId(fileId);
    setAiOutput('');
    setParsedSuggestions([]);
    setError(null);
    setShowModified(false);
    setSelectedTarget(null); // Clear selected target if manually selecting a file
    // If a project is loaded, allow tasks. If targets were displayed, user is now overriding.
    if (workflowStep !== WorkflowStep.INIT && workflowStep !== WorkflowStep.PROJECT_LOADED) {
      // Potentially set a step like MANUAL_FILE_VIEW or allow tasks
    }

  }, [workflowStep]);

  const handleTaskExecute = useCallback(async (taskType: TaskType, targetFileId?: string) => {
    const fileIdToProcess = targetFileId || activeFileId;
    if (!fileIdToProcess) {
      setError("Please select a file or target first.");
      return;
    }
    const currentFile = projectFiles.find(f => f.id === fileIdToProcess);
    if (!currentFile) {
      setError("Selected file not found.");
      return;
    }

    setIsLoading(true);
    setAiOutput('');
    setParsedSuggestions([]);
    setError(null);
    setShowModified(false);

    try {
      if (taskType === TaskId.ANALYZE_IMPROVE || taskType === TaskId.GENERATE_TESTS) {
        const result = await processFileTaskWithAI(currentFile, taskType, projectFiles);
        setAiOutput(result);
        const suggestions = parseAIDiff(result);
        setParsedSuggestions(suggestions);
        if (selectedTarget) { // If this was from a target
            setWorkflowStep(WorkflowStep.TARGET_PROCESSED_SHOWING_SUGGESTIONS);
        }
      } else {
        // Handle other task types if any (e.g. project level ones are handled by their own functions)
        setError("Unsupported task type for direct execution here.");
      }
    } catch (err) {
      console.error("Error processing with AI:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      setAiOutput('');
      setParsedSuggestions([]);
       if (selectedTarget) {
            setWorkflowStep(WorkflowStep.TARGETS_DISPLAYED); // Go back if processing target failed
       }
    } finally {
      setIsLoading(false);
    }
  }, [activeFileId, projectFiles, selectedTarget]);

  const handleApplyChanges = useCallback(() => {
    if (activeFileId && parsedSuggestions.length > 0) {
      setProjectFiles(prevFiles => 
        prevFiles.map(file => {
          if (file.id === activeFileId) {
            const newContent = applyParsedDiffs(file.content, parsedSuggestions);
            return { ...file, content: newContent, isModified: newContent !== file.originalContent };
          }
          return file;
        })
      );
      setWorkflowStep(WorkflowStep.MODIFICATIONS_APPLIED);
      // Optionally, clear suggestions for current file or move to next target/overview
      setParsedSuggestions([]);
      setAiOutput("Changes applied to " + projectFiles.find(f=>f.id === activeFileId)?.name + ". View modified project or select another target.");
    }
  }, [activeFileId, parsedSuggestions, projectFiles]);
  
  const handleViewModifiedProject = () => {
    // For now, just log to console or display a simple list
    console.log("Modified Project Files:", projectFiles.filter(f => f.isModified));
    alert("Check console for modified file details. In a real app, this would offer a download or a multi-file view.");
  };


  const activeFile = activeFileId ? projectFiles.find(f => f.id === activeFileId) : null;
  const modifiedCodeForActiveFile = activeFile && parsedSuggestions.length > 0 ? applyParsedDiffs(activeFile.content, parsedSuggestions) : activeFile?.content;


  const renderMainContent = () => {
    switch (workflowStep) {
      case WorkflowStep.INIT:
        return (
          <div className="flex-grow flex items-center justify-center text-slate-500">
            <FileUploadButton onLoadProject={handleLoadProject} />
          </div>
        );
      case WorkflowStep.SUMMARY_GENERATING:
        return <LoadingIndicator />;
      case WorkflowStep.SUMMARY_DISPLAYED:
      case WorkflowStep.PROJECT_LOADED: // Fallback if summary fails
        return <ProjectSummaryView summary={projectSummary || "Summary generation failed or not available."} onNext={handleAnalyzeProject} isLoading={isLoading}/>;
      case WorkflowStep.ANALYSIS_GENERATING_TARGETS:
        return <LoadingIndicator />;
      case WorkflowStep.TARGETS_DISPLAYED:
        return <ProjectAnalysisView targets={analysisTargets} onSelectTarget={handleSelectTarget} isLoading={isLoading} />;
      case WorkflowStep.TARGET_PROCESSING:
        return <LoadingIndicator />;
      case WorkflowStep.TARGET_PROCESSED_SHOWING_SUGGESTIONS:
      case WorkflowStep.MODIFICATIONS_APPLIED: // Keep showing current file after applying
        if (activeFile) {
          return (
            <>
              <h2 className="text-lg font-semibold text-sky-400">
                Processing File: <span className="text-amber-400">{activeFile.name}</span>
                {selectedTarget && <span className="text-xs text-slate-400 block"> (Target: {selectedTarget.areaDescription})</span>}
              </h2>
              <div className="flex-grow overflow-y-auto border border-slate-700 rounded-md p-2 bg-slate-950">
                <CodeView
                  code={showModified && modifiedCodeForActiveFile ? modifiedCodeForActiveFile : activeFile.content}
                  language={activeFile.language}
                />
              </div>
              {/* TaskPanel might be simplified or specific to target here */}
              {workflowStep === WorkflowStep.TARGET_PROCESSED_SHOWING_SUGGESTIONS && parsedSuggestions.length > 0 && (
                <div className="mt-2 space-y-2">
                    <Button onClick={() => setShowModified(prev => !prev)} variant="secondary">
                        {showModified ? "View Original for Diff" : "Preview AI Modified Code"}
                    </Button>
                    <Button onClick={handleApplyChanges} variant="primary">
                        Apply Suggested Changes to {activeFile.name}
                    </Button>
                </div>
              )}
               {workflowStep === WorkflowStep.MODIFICATIONS_APPLIED && (
                 <Button onClick={() => setWorkflowStep(WorkflowStep.TARGETS_DISPLAYED)} variant="secondary" className="mt-2">
                    Back to Targets
                </Button>
               )}
            </>
          );
        }
        return <p className="text-slate-500">Error: No active file for processing.</p>;
      default:
        return (
          <div className="flex-grow flex items-center justify-center text-slate-500">
            <p>Load a project to begin.</p>
          </div>
        );
    }
  };
  
  const renderRightPanelContent = () => {
     if (isLoading && (workflowStep === WorkflowStep.SUMMARY_GENERATING || workflowStep === WorkflowStep.ANALYSIS_GENERATING_TARGETS || workflowStep === WorkflowStep.TARGET_PROCESSING)) {
        return <LoadingIndicator />;
     }
     if (error) return <p className="text-red-400 whitespace-pre-wrap">Error: {error}</p>;

     switch(workflowStep) {
        case WorkflowStep.SUMMARY_DISPLAYED:
            return <pre className="text-slate-300 whitespace-pre-wrap">{projectSummary || "No summary available."}</pre>;
        case WorkflowStep.TARGETS_DISPLAYED:
            return <p className="text-slate-400">Select a target from the center panel to view specific AI suggestions here.</p>;
        case WorkflowStep.TARGET_PROCESSED_SHOWING_SUGGESTIONS:
        case WorkflowStep.MODIFICATIONS_APPLIED: // Show last AI output even after applying
            if (aiOutput) {
                 return parsedSuggestions.length > 0 ? (
                    parsedSuggestions.map((suggestion, index) => (
                    <div key={index} className="mb-4 p-3 bg-slate-800 rounded-md">
                        {suggestion.explanation.trim() && (
                            <p className="text-sm text-slate-300 mb-2 whitespace-pre-wrap">{suggestion.explanation.trim()}</p>
                        )}
                        {suggestion.searchBlock && suggestion.replaceBlock && (
                        <>
                            <p className="text-xs text-red-400 mb-1">Original:</p>
                            <pre className="text-xs bg-red-900 bg-opacity-30 p-2 rounded whitespace-pre-wrap overflow-x-auto"><code>{suggestion.searchBlock.trim()}</code></pre>
                            <p className="text-xs text-green-400 mt-2 mb-1">Suggested:</p>
                            <pre className="text-xs bg-green-900 bg-opacity-30 p-2 rounded whitespace-pre-wrap overflow-x-auto"><code>{suggestion.replaceBlock.trim()}</code></pre>
                        </>
                        )}
                    </div>
                    ))
                ) : (
                    <p className="text-slate-300 whitespace-pre-wrap">{aiOutput}</p>
                );
            }
            return <p className="text-slate-500">AI output will appear here for the selected target.</p>;
        default:
            return <p className="text-slate-500">AI output will appear here.</p>;
     }
  };


  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow flex flex-col md:flex-row p-4 gap-4 bg-slate-800">
        {/* Left Panel - Files */}
        {(workflowStep !== WorkflowStep.INIT && projectFiles.length > 0) && (
          <div className="w-full md:w-1/4 flex flex-col gap-4 bg-slate-900 p-4 rounded-lg shadow-xl">
             <Button onClick={handleLoadProject} variant="secondary" className="w-full mb-2">
                <span role="img" aria-label="folder-arrow-down" className="mr-2">📂🔄</span> Load New/Reset Project
            </Button>
            <h2 className="text-lg font-semibold mb-2 text-sky-400">Project Files</h2>
            <div className="flex-grow overflow-y-auto">
              <FileList
                files={projectFiles}
                activeIndex={projectFiles.findIndex(f => f.id === activeFileId)} // Adapt FileList if it expects index
                onFileSelect={(index) => handleFileSelect(projectFiles[index].id)} // Adapt FileList to pass ID or find by index
              />
            </div>
            {workflowStep === WorkflowStep.MODIFICATIONS_APPLIED && projectFiles.some(f=>f.isModified) && (
                <Button onClick={handleViewModifiedProject} variant="primary" className="mt-4">
                    View/Download Modified Project
                </Button>
            )}
          </div>
        )}

        {/* Center Panel (Workflow dependent) */}
        <div className={`w-full ${workflowStep !== WorkflowStep.INIT && projectFiles.length > 0 ? 'md:w-1/2' : 'md:w-3/4'} flex flex-col gap-4 bg-slate-900 p-4 rounded-lg shadow-xl`}>
          {renderMainContent()}
        </div>

        {/* Right Panel (AI Output / Context) */}
         {(workflowStep !== WorkflowStep.INIT && projectFiles.length > 0) && (
            <div className="w-full md:w-1/4 flex flex-col gap-4 bg-slate-900 p-4 rounded-lg shadow-xl">
            <h2 className="text-lg font-semibold text-sky-400">AI Context / Output</h2>
            <div className="flex-grow overflow-y-auto border border-slate-700 rounded-md p-3 bg-slate-950">
                {renderRightPanelContent()}
            </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;

