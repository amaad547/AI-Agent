# 📚 BOARDMATE — Class 10 AI Study Assistant

You can try the project here:

🌐 **Live URL:**  
https://boardmateai.vercel.app

BOARDMATE is an AI-powered study assistant designed for Class 10 students.  
It provides structured, syllabus-oriented learning help across:

✔ Previous Year Questions (PYQ)  
✔ Concept Explanations  
✔ Practice Questions  
✔ Quick Revision Notes  
✔ Flowcharts as Diagrams (Mermaid-based)  
✔ Adaptive MCQ Tests with Analysis  
✔ Downloadable PDFs & PNGs  
✔ Mobile Responsive UI

---

## 🚀 Features

### **1. Multi-Mode Study Assistant**
Students can choose what they want:
- 📝 PYQ Practice
- 💡 Concept Explain
- ✏️ Practice Questions
- 📚 Short Notes
- 📊 Flowcharts
- 🎯 Adaptive Testing

### **2. AI Structured Formatting**
For each mode AI follows strict templates:

| Mode | Output Format |
|---|---|
| PYQ | MCQ + Short Answer + Long Answer + Marking Scheme |
| Concept | Simple Definition + Working + Examples + Mistakes |
| Notes | Key Points + Formulas + Tricks |
| Flowcharts | Mermaid syntax → Diagram PNG |
| Practice | Easy, Medium, Hard with Hints |
| Adaptive Test | MCQ + Accuracy |

---

## 🖥️ Tech Stack

**Frontend:**  
`HTML, CSS, JavaScript`

**Backend:**  
`Python` (Middleware between AI & Client)

**AI Provider:**  
`Groq API`

**Libraries Used:**
| Purpose | Library |
|---|---|
| PDF Export | jsPDF |
| PNG Export | html2canvas |
| Diagram Rendering | Mermaid.js |
| Responsive UI | CSS Media Queries |

---

## 🔌 Architecture

Backend acts as:
- Prompt formatter
- Validation layer
- Response normalizer

---

## 📱 Responsive Design

✔ Works on mobile, tablet, laptop  
✔ Swaps mode buttons into hamburger menu on small screens  

---

## 📂 Folder Structure

📦 BOARDMATE
┣ 📁 frontend
┃ ┣ index.html
┃ ┣ styles.css
┃ ┗ script.js
┣ 📁 backend
┃ ┣ server.py
┃ ┗ requirements.txt
┗ README.md

---

## 📊 Adaptive Test Logic

1. Fetch MCQs from AI
2. Store user answers
3. Display analytics 

---
