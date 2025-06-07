
import { ProjectFile } from './types';
import { v4 as uuidv4 } from 'https://esm.sh/uuid'; // For generating unique IDs

export const GEMINI_MODEL_NAME = 'gemini-2.5-flash-preview-04-17';

const createProjectFile = (name: string, language: string, content: string): ProjectFile => {
  const cleanContent = content.trimStart();
  return {
    id: uuidv4(),
    name,
    language,
    content: cleanContent,
    originalContent: cleanContent,
    isModified: false,
  };
};

export const SAMPLE_PROJECT: ProjectFile[] = [
  createProjectFile(
    'calculator.py',
    'python',
    `
def add(x, y):
    return x + y

def subtract(x, y):
    return x - y

def multiply(x, y):
    # A simple multiplication function
    result = x * y
    return result

def divide(x, y):
    if y == 0:
        return "Error: Cannot divide by zero"
    return x / y

# Example usage (can be improved)
num1 = 10
num2 = 5
print("Addition:", add(num1, num2))
print("Subtraction:", subtract(num1, num2))
print("Multiplication:", multiply(num1, num2))

# Division example needs better handling for display
div_result = divide(num1, num2)
print("Division:", div_result)

# Another division
num3 = 8
num4 = 0
print("Division by zero test:", divide(num3, num4))
`
  ),
  createProjectFile(
    'utils.js',
    'javascript',
    `
// Utility functions

function greet(name) {
  return "Hello, " + name + "!";
}

function isEmpty(arr) {
  if (arr.length === 0) {
    return true;
  } else {
    return false;
  }
}

const processData = (data) => {
  // This function could be more efficient
  let processed = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i].value > 10) {
      processed.push({ id: data[i].id, status: "high" });
    } else {
      processed.push({ id: data[i].id, status: "low" });
    }
  }
  return processed;
}

console.log(greet("World"));
console.log(isEmpty([]));
console.log(isEmpty([1, 2]));
`
  ),
  createProjectFile(
    'README.md',
    'markdown',
    `
# Sample Project

This is a sample project for the AlphaEvolve UI Demo.

## Files

- \`calculator.py\`: A simple Python calculator.
- \`utils.js\`: Some JavaScript utility functions.

## Purpose

To demonstrate the capabilities of an AI-powered code evolution system.
The new workflow involves:
1. Loading the project.
2. AI generating a project summary.
3. AI analyzing the project to suggest improvement targets.
4. User selecting a target.
5. AI processing the selected target and suggesting changes.
6. User applying changes.
7. Viewing the modified project.
    `
  )
];
