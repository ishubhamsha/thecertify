import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'output_leetcode_questions.txt');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
let state = 'seek'; // seek, title, desc
let parsedQuestions = [];
let activeQuestion = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  if (trimmed === '------------------------------') {
    if (state === 'seek') {
      state = 'title';
      if (activeQuestion) {
        parsedQuestions.push(activeQuestion);
      }
      activeQuestion = {
        title: '',
        description: '',
        examples: [],
        constraints: []
      };
    } else if (state === 'title') {
      state = 'desc';
    } else if (state === 'desc') {
      state = 'seek';
    }
    continue;
  }
  
  if (state === 'title' && trimmed) {
    activeQuestion.title = (activeQuestion.title + ' ' + trimmed).trim();
  } else if (state === 'desc' && activeQuestion) {
    activeQuestion.description += line + '\n';
  }
}

if (activeQuestion && activeQuestion.title) {
  parsedQuestions.push(activeQuestion);
}

// Clean descriptions
parsedQuestions = parsedQuestions.map((q, idx) => {
  q.id = (idx + 1).toString();
  q.description = q.description.trim();
  // Assign category and difficulty dynamically
  const titleLower = q.title.toLowerCase();
  let category = 'Array';
  if (titleLower.includes('string') || titleLower.includes('palindrome') || titleLower.includes('anagram') || titleLower.includes('parentheses')) {
    category = 'String';
  } else if (titleLower.includes('sum') || titleLower.includes('number') || titleLower.includes('integer') || titleLower.includes('math') || titleLower.includes('digit') || titleLower.includes('divide')) {
    category = 'Math';
  } else if (titleLower.includes('search') || titleLower.includes('binary') || titleLower.includes('sort') || titleLower.includes('median')) {
    category = 'Binary Search';
  } else if (titleLower.includes('coin') || titleLower.includes('change') || titleLower.includes('path') || titleLower.includes('dp')) {
    category = 'Dynamic Programming';
  } else if (titleLower.includes('duplicate') || titleLower.includes('array') || titleLower.includes('two') || titleLower.includes('permut')) {
    category = 'Array';
  } else if (titleLower.includes('list') || titleLower.includes('node') || titleLower.includes('merge') || titleLower.includes('reverse')) {
    category = 'LinkedList';
  }
  
  let difficulty = 'easy';
  if (titleLower.includes('median') || titleLower.includes('regex') || titleLower.includes('sudoku') || titleLower.includes('k-group') || titleLower.includes('first missing')) {
    difficulty = 'hard';
  } else if (titleLower.includes('zigzag') || titleLower.includes('atoi') || titleLower.includes('3sum') || titleLower.includes('4sum') || titleLower.includes('coin') || titleLower.includes('combination') || titleLower.includes('sudoku solver') || titleLower.includes('longest valid')) {
    difficulty = 'medium';
  }
  
  q.category = category;
  q.difficulty = difficulty;
  
  // Set acceptance rate
  q.acceptance = (40 + Math.floor(Math.random() * 25)) + '.' + Math.floor(Math.random() * 10) + '%';
  return q;
});

console.log(`Parsed ${parsedQuestions.length} questions from output_leetcode_questions.txt`);
fs.writeFileSync(path.join(__dirname, 'parsed_questions.json'), JSON.stringify(parsedQuestions, null, 2));
