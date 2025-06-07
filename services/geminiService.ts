
import { GoogleGenAI } from "@google/genai";
import { ProjectFile, TaskType, TaskId, ProjectTarget } from '../types';
import { GEMINI_MODEL_NAME } from '../constants';
import { v4 as uuidv4 } from 'https://esm.sh/uuid';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. Gemini API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

function getFileContextForPrompt(files: ProjectFile[]): string {
  return files.map(f => `
--- File: ${f.name} (${f.language}) ---
\`\`\`${f.language}
${f.content}
\`\`\`
`).join('\n');
}

function getPromptForTask(
  taskType: TaskType,
  files: ProjectFile[], // For project-level tasks
  targetFile?: ProjectFile, // For file-specific tasks
): string {
  
  const projectFileOverview = `The project contains the following files: ${files.map(f => f.name).join(', ')}.`;

  switch (taskType) {
    case TaskId.PROJECT_SUMMARY:
      return `
You are AlphaEvolve, an expert coding assistant.
I have a project with the following files and content:
${getFileContextForPrompt(files)}

Please provide a concise summary of this project. Describe its purpose, main components, and technologies used based on the file contents.
Keep the summary to 2-3 paragraphs.
`;

    case TaskId.PROJECT_ANALYZE_TARGETS:
      return `
You are AlphaEvolve, an expert coding assistant.
I have a project with the following files and content:
${getFileContextForPrompt(files)}

Analyze the entire project and identify specific areas (files, functions, classes, or sections) that could be improved or benefit from further action (e.g., refactoring, optimization, test generation).

For each identified area, suggest a concrete action.
You MUST return your suggestions as a JSON array of objects. Each object in the array should have the following EXACT keys:
- "fileName": string (exact name of the file, e.g., "utils.js")
- "areaDescription": string (specific function, class, or section name, or "entire file" if applicable, e.g., "function processData", "class Calculator")
- "aiSuggestion": string (a brief, actionable description of what to do, e.g., "Refactor for clarity and efficiency.", "Generate unit tests for edge cases.")
- "recommendedTaskId": string (the most appropriate TaskId for this action, choose one from: "${TaskId.ANALYZE_IMPROVE}", "${TaskId.GENERATE_TESTS}")

Example of a valid JSON output:
\`\`\`json
[
  {
    "fileName": "calculator.py",
    "areaDescription": "function divide",
    "aiSuggestion": "Improve error handling for division by zero and clarify return types.",
    "recommendedTaskId": "${TaskId.ANALYZE_IMPROVE}"
  },
  {
    "fileName": "utils.js",
    "areaDescription": "function processData",
    "aiSuggestion": "Optimize the loop for better performance with large datasets.",
    "recommendedTaskId": "${TaskId.ANALYZE_IMPROVE}"
  },
  {
    "fileName": "calculator.py",
    "areaDescription": "entire file",
    "aiSuggestion": "Generate comprehensive unit tests covering all functions.",
    "recommendedTaskId": "${TaskId.GENERATE_TESTS}"
  }
]
\`\`\`
Do NOT include any other text, explanations, or markdown formatting outside of this single JSON array.
If no specific improvement targets are identified, return an empty JSON array: [].
`;

    case TaskId.ANALYZE_IMPROVE:
      if (!targetFile) throw new Error("Target file is required for ANALYZE_IMPROVE task.");
      return `
You are AlphaEvolve, an expert coding assistant.
${projectFileOverview}
The user wants to improve the file "${targetFile.name}" (${targetFile.language}).
Current file content:
\`\`\`${targetFile.language}
${targetFile.content}
\`\`\`
Please analyze this code for potential improvements, optimizations, and adherence to best practices.
If you suggest code changes, you MUST provide them ONLY in the following diff format:
<<<<<<< SEARCH
# Original code block to be found and replaced
# (Ensure this block is an EXACT match from the provided code)
=======
# New code block to replace the original
>>>>>>> REPLACE
For each set of changes, provide a brief explanation BEFORE the diff block.
If multiple distinct changes are suggested, use multiple diff blocks, each preceded by its explanation.
If no significant changes are needed, state that the code is already good or make minor stylistic suggestions with explanations but without diff blocks.
Focus on correctness, efficiency, readability, and maintainability.
Do not invent new functionality, only improve the existing code.
`;

    case TaskId.GENERATE_TESTS:
      if (!targetFile) throw new Error("Target file is required for GENERATE_TESTS task.");
      return `
You are AlphaEvolve, an expert coding assistant.
${projectFileOverview}
The user wants to generate unit tests for the file "${targetFile.name}" (${targetFile.language}).
Current file content:
\`\`\`${targetFile.language}
${targetFile.content}
\`\`\`
Please generate unit tests for the provided code.
The tests should cover various scenarios, including edge cases.
Provide the tests as a single code block in the same language (${targetFile.language}) if idiomatic (e.g., pytest for Python, Jest/Mocha for JavaScript), or describe the test cases clearly.
Start with a brief explanation of your testing strategy.
Example for Python (pytest):
\`\`\`python
# Test cases for ${targetFile.name}
import pytest
# from .${targetFile.name.replace('.py','')} import function_to_test # if applicable

# Test for function_name
def test_function_name_case_1():
    assert function_to_test(input) == expected_output
\`\`\`
Example for JavaScript (Jest):
\`\`\`javascript
// Test cases for ${targetFile.name}
// const { functionToTest } = require('./${targetFile.name}'); // if applicable

describe('${targetFile.name}', () => {
  test('should test functionName for case 1', () => {
    expect(functionToTest(input)).toBe(expectedOutput);
  });
});
\`\`\`
Adapt the test structure to the provided code.
`;
    default:
      return `Perform a general analysis of this code. Context: ${targetFile?.content || getFileContextForPrompt(files)}`;
  }
}

const makeGeminiRequest = async (prompt: string): Promise<string> => {
  if (!API_KEY) {
    return Promise.reject(new Error("Gemini API Key is not configured. Please set the API_KEY environment variable."));
  }
  try {
    const response = await ai.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    if (error instanceof Error) {
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error('An unknown error occurred while communicating with the Gemini API.');
  }
};

export const getProjectSummary = async (files: ProjectFile[]): Promise<string> => {
  const prompt = getPromptForTask(TaskId.PROJECT_SUMMARY, files);
  return makeGeminiRequest(prompt);
};

export const getProjectAnalysisTargets = async (files: ProjectFile[]): Promise<ProjectTarget[]> => {
  const prompt = getPromptForTask(TaskId.PROJECT_ANALYZE_TARGETS, files);
  const rawResponse = await makeGeminiRequest(prompt);

  try {
    let jsonStr = rawResponse.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    const parsedTargets = JSON.parse(jsonStr) as Omit<ProjectTarget, 'id'>[];
    return parsedTargets.map(target => ({ ...target, id: uuidv4() }));
  } catch (e) {
    console.error("Failed to parse JSON response for targets:", e, "Raw response:", rawResponse);
    // Fallback: Try to provide a user-friendly message or a generic target if parsing fails
    return [{
        id: uuidv4(),
        fileName: files[0]?.name || "Project",
        areaDescription: "General Project Review",
        aiSuggestion: `AI analysis failed to return specific targets. Raw AI Output: ${rawResponse.substring(0, 200)}... Consider general improvements.`,
        recommendedTaskId: TaskId.ANALYZE_IMPROVE 
    }];
  }
};

export const processFileTaskWithAI = async (
  targetFile: ProjectFile,
  taskType: TaskId.ANALYZE_IMPROVE | TaskId.GENERATE_TESTS,
  allProjectFiles: ProjectFile[]
): Promise<string> => {
  const prompt = getPromptForTask(taskType, allProjectFiles, targetFile);
  return makeGeminiRequest(prompt);
};