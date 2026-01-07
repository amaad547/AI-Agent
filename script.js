function isStudyRelated(text) {
    const studyKeywords = [
        "class 10", "cbse", "icse",
        "physics", "chemistry", "biology", "math", "mathematics",
        "formula", "numerical", "derivation",
        "explain", "define", "what is",
        "chapter", "topic", "diagram",
        "pyq", "previous year",
        "notes", "short notes",
        "practice", "question", "answer",
        "exam", "revision"
    ];

    const lowerText = text.toLowerCase();

    return studyKeywords.some(keyword => lowerText.includes(keyword));
}


// ============================================
// CONFIGURATION
// ============================================
// const API_KEY = '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';
const USE_DEMO_MODE = false;

// ============================================
// GLOBAL STATE
// ============================================
let userPreferences = {
    board: '',
    subject: '',
    mode: ''
};
let currentMode = 'pyq';

// ============================================
// SETUP SCREEN LOGIC
// ============================================
const setupScreen = document.getElementById('setupScreen');
const chatScreen = document.getElementById('chatScreen');
const boardSelect = document.getElementById('boardSelect');
const subjectSelect = document.getElementById('subjectSelect');
const startBtn = document.getElementById('startBtn');
const modeCards = document.querySelectorAll('.mode-card');

// Mode card selection
modeCards.forEach(card => {
    card.addEventListener('click', function () {
        modeCards.forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');
        userPreferences.mode = this.dataset.mode;
        currentMode = this.dataset.mode;
        checkFormComplete();
    });
});

// Check if form is complete
function checkFormComplete() {
    if (boardSelect.value && subjectSelect.value && userPreferences.mode) {
        startBtn.disabled = false;
    } else {
        startBtn.disabled = true;
    }
}

boardSelect.addEventListener('change', function () {
    userPreferences.board = this.value;
    checkFormComplete();
});

subjectSelect.addEventListener('change', function () {
    userPreferences.subject = this.value;
    checkFormComplete();
});

// Start button click
startBtn.addEventListener('click', function () {
    // Update display
    document.getElementById('displayBoard').textContent = userPreferences.board;
    document.getElementById('displaySubject').textContent = userPreferences.subject;

    // Set active mode button
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.mode === userPreferences.mode) {
            btn.classList.add('active');
        }
    });

    // Switch screens
    setupScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');

    // Show demo mode warning
    if (USE_DEMO_MODE) {
        showDemoWarning();
    }
});

// Change settings button
document.getElementById('changePrefsBtn').addEventListener('click', function () {
    chatScreen.classList.add('hidden');
    setupScreen.classList.remove('hidden');

    // Clear chat
    const chatArea = document.getElementById('chatArea');
    chatArea.innerHTML = `
                <div class="welcome-message">
                    <h2>Welcome Back! 👋</h2>
                    <p>Update your preferences and start studying again.</p>
                </div>
            `;
});

// ============================================
// MODE SELECTION (IN CHAT)
// ============================================
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentMode = this.dataset.mode;
        userPreferences.mode = this.dataset.mode;
    });
});

// ============================================
// SEND MESSAGE
// ============================================
document.getElementById('sendBtn').addEventListener('click', sendMessage);
document.getElementById('userInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();

    if (!message) return;

    input.value = '';
    document.getElementById('sendBtn').disabled = true;

    addUserMessage(message);

    // ✅ GUARDRAIL CHECK
    if (!isStudyRelated(message)) {
        addAgentMessage(
            "❌ I can only help with Class 10 study-related questions.\n\nPlease ask something from your syllabus like:\n• Explain a concept\n• PYQs\n• Practice questions\n• Short notes"
        );
        document.getElementById('sendBtn').disabled = false;
        return;
    }

    showLoading();

    try {
        await processWithAgent(message);
    } catch (error) {
        addAgentMessage("⚠️ Something went wrong. Please try again.");
    }

    hideLoading();
    document.getElementById('sendBtn').disabled = false;
}


// ============================================
// AGENT LOGIC
// ============================================
async function processWithAgent(userMessage) {
    const intent = parseIntent(userMessage);
    const selectedMode = intent.mode || currentMode;
    const prompt = buildPrompt(selectedMode, intent);
    const response = await callAgentAPI(prompt);
    displayResponse(response, selectedMode, intent);
}

function parseIntent(message) {
    const intent = {
        mode: null,
        topic: null
    };

    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('pyq') || lowerMsg.includes('previous year')) {
        intent.mode = 'pyq';
    } else if (lowerMsg.includes('explain') || lowerMsg.includes('what is')) {
        intent.mode = 'concept';
    } else if (lowerMsg.includes('practice') || lowerMsg.includes('questions')) {
        intent.mode = 'practice';
    } else if (lowerMsg.includes('notes') || lowerMsg.includes('revision')) {
        intent.mode = 'notes';
    }

    const topicMatch = message.match(/on\s+([^.!?]+)/i);
    if (topicMatch) {
        intent.topic = topicMatch[1].trim();
    } else {
        intent.topic = message;
    }

    return intent;
}

function buildPrompt(mode, intent) {
    const board = userPreferences.board;
    const subject = userPreferences.subject;
    const topic = intent.topic || 'general topics';

    const boardInfo = board === 'ICSE'
        ? 'ICSE (Indian Certificate of Secondary Education)'
        : 'CBSE (Central Board of Secondary Education)';

    switch (mode) {
        case 'pyq':
            return `You are a ${boardInfo} Class 10 exam paper creator for ${subject}.
Generate 3 previous year style questions on "${topic}".

Follow this EXACT structure:

**Section A - Multiple Choice (1 mark)**
Create 1 MCQ with 4 options. Mark correct answer with ✓

**Section B - Short Answer (3 marks)**
Create 1 question requiring explanation or diagram.

**Section C - Long Answer (5 marks)**
Create 1 detailed question.

**Marking Scheme**
Show mark distribution for each question.

Use ${board} Class 10 ${subject} syllabus. Make questions exam-realistic.`;

        case 'concept':
            return `Explain "${topic}" to a ${board} Class 10 ${subject} student.

Structure:

**Simple Definition**
What is it in simple words?

**How It Works**
Break into 3-4 clear steps

**Real-Life Example**
Give a relatable example

**Common Mistakes**
What students get wrong

Use ${board} Class 10 ${subject} terminology. Keep it simple.`;

        case 'practice':
            return `Create 3 practice questions on "${topic}" for ${board} Class 10 ${subject}.

**Question 1** [Easy]
Basic application

**Question 2** [Medium]
Requires understanding

**Question 3** [Hard]
Combines concepts

Include:
💡 Hint: (clue without full answer)
✓ Answer: (with explanation)

Match ${board} syllabus for Class 10 ${subject}.`;

        case 'notes':
            return `Create quick revision notes on "${topic}" for ${board} Class 10 ${subject}.

Format:

**📌 Key Definitions**
3-4 important terms

**⚡ Must-Know Formulas/Rules**
Essential formulas

**🎯 Quick Points**
5-6 bullet points

**🧠 Memory Trick**
One mnemonic

Focus on ${board} Class 10 ${subject} exam requirements.`;

        default:
            return `Help a ${board} Class 10 ${subject} student with: ${topic}`;
    }
}

async function callAgentAPI(prompt) {
    try {
        const res = await fetch("http://127.0.0.1:5000/api/agent", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ prompt })
        });

        const data = await res.json();
        return data.output;

    } catch (err) {
        console.error(err);
        return "❌ Backend not reachable";
    }
}


function getDemoResponse(mode) {
    const board = userPreferences.board;
    const subject = userPreferences.subject;

    const demos = {
        'pyq': `**${board} Class 10 ${subject} - Previous Year Questions**

**Section A - Multiple Choice (1 mark)**

**Q1.** The SI unit of electric current is:
(a) Volt
(b) Ampere ✓
(c) Ohm
(d) Watt

**Section B - Short Answer (3 marks)**

**Q2.** State Ohm's Law and draw a circuit diagram to verify it.

**Marking Scheme:**
- Definition (1 mark)
- Formula: V = IR (1 mark)
- Circuit diagram (1 mark)

**Section C - Long Answer (5 marks)**

**Q3.** Explain the heating effect of electric current with applications.

**Marking Scheme:**
- Explanation (1 mark)
- Derivation: H = I²Rt (2 marks)
- Two applications (2 marks)`,

        'concept': `**${board} Class 10 ${subject} - Concept Explanation**

**Simple Definition:**
Photosynthesis is how plants make food using sunlight, water, and CO₂.

**How It Works:**

1. **Light Absorption:** Chlorophyll captures sunlight
2. **Water Splitting:** H₂O breaks into H₂ and O₂
3. **Carbon Fixation:** CO₂ combines with H₂
4. **Glucose Formation:** Energy stored as food

**Real-Life Example:**
Plants are greener in sunlight because chlorophyll is actively working. This is why forests produce fresh air!

**Common Mistakes:**
❌ Confusing with respiration
❌ Thinking only leaves do it
❌ Wrong reactants (needs CO₂, not O₂)`,

        'practice': `**${board} Class 10 ${subject} - Practice Questions**

**Question 1** [Easy]
A bulb has 240Ω resistance. Find voltage if 5A current flows.

💡 **Hint:** Use V = IR
✓ **Answer:** V = 5 × 240 = 1200V

**Question 2** [Medium]
Calculate equivalent resistance: 3Ω and 6Ω in parallel.

💡 **Hint:** 1/R = 1/R₁ + 1/R₂
✓ **Answer:** R = 2Ω

**Question 3** [Hard]
Three resistors: 2Ω, 3Ω in series, parallel with 6Ω. Voltage = 12V. Find current.

💡 **Hint:** Series first, then parallel
✓ **Answer:** Total current = 4.4A`,

        'notes': `**${board} Class 10 ${subject} - Quick Notes**

**📌 Key Definitions:**
- **Current:** Flow of charge (Ampere)
- **Voltage:** Potential difference (Volt)
- **Resistance:** Opposition to flow (Ohm)
- **Power:** Energy rate (Watt)

**⚡ Must-Know Formulas:**
- V = IR (Ohm's Law)
- P = VI = I²R = V²/R
- Series: R_total = R₁ + R₂
- Parallel: 1/R = 1/R₁ + 1/R₂

**🎯 Quick Points:**
• Series: Same current, different voltages
• Parallel: Same voltage, different currents
• High R → Low I
• 1 kWh = 1 unit

**🧠 Memory Trick:**
**VIR** = Voltage = I × Resistance`
    };

    return demos[mode] || `Demo response for ${board} ${subject} not available.`;
}

function displayResponse(response, mode, intent) {
    const formatted = formatByMode(response, mode);
    addAgentMessage(formatted, true);
}

function formatByMode(text, mode) {
    let formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

    if (mode === 'pyq' || mode === 'practice' || mode === 'notes') {
        return `<div class="output-box">
                    <h3>📝 ${mode.toUpperCase()} Output</h3>
                    ${formatted}
                </div>`;
    }

    return formatted;
}

// ============================================
// UI FUNCTIONS
// ============================================
function addUserMessage(text) {
    const chatArea = document.getElementById('chatArea');
    const welcome = chatArea.querySelector('.welcome-message');
    if (welcome) welcome.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user';
    messageDiv.innerHTML = `
                <div class="avatar">U</div>
                <div class="message-content">${escapeHtml(text)}</div>
            `;
    chatArea.appendChild(messageDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function addAgentMessage(text, isHTML = false) {
    const chatArea = document.getElementById('chatArea');
    const welcome = chatArea.querySelector('.welcome-message');
    if (welcome) welcome.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message agent';
    messageDiv.innerHTML = `
                <div class="avatar">AI</div>
                <div class="message-content">${isHTML ? text : escapeHtml(text)}</div>
            `;
    chatArea.appendChild(messageDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function showLoading() {
    const chatArea = document.getElementById('chatArea');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message agent';
    loadingDiv.id = 'loadingMessage';
    loadingDiv.innerHTML = `
                <div class="avatar">AI</div>
                <div class="loading">
                    <span></span><span></span><span></span>
                </div>
            `;
    chatArea.appendChild(loadingDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function hideLoading() {
    const loading = document.getElementById('loadingMessage');
    if (loading) loading.remove();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showDemoWarning() {
    const chatArea = document.getElementById('chatArea');
    const warning = document.createElement('div');
    warning.className = 'setup-warning';
    warning.innerHTML = `
                <strong>ℹ️ Demo Mode Active</strong><br>
                Using sample responses.  target="_blank">console.anthropic.com</a> for real AI.
            `;
    chatArea.insertBefore(warning, chatArea.firstChild);
}