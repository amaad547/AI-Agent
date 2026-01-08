// function isStudyRelated(text) {
//     const studyKeywords = [
//         "class 10", "cbse", "icse",
//         "physics", "chemistry", "biology", "math", "mathematics",
//         "formula", "numerical", "derivation",
//         "explain", "define", "what is",
//         "chapter", "topic", "diagram",
//         "pyq", "previous year",
//         "notes", "short notes",
//         "practice", "question", "answer",
//         "exam", "revision"
//     ];

//     const lowerText = text.toLowerCase();

//     return studyKeywords.some(keyword => lowerText.includes(keyword));
// }


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

let adaptiveTest = {
    active: false,
    questions: [],
    userAnswers: [],
    currentIndex: 0,
    score: 0,
    wrongTopics: []
};

adaptiveTest.total = 10;



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
    // Switch screens
    setupScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    if (currentMode === "adaptive") {
        startAdaptiveTest();
        return;
    }


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
    if (adaptiveTest.active) {
        addAgentMessage("❗ During Adaptive Test no text input needed. Select MCQ option.");
        return;
    }


    // ✅ GUARDRAIL CHECK
    // if (!isStudyRelated(message)) {
    //     addAgentMessage(
    //         "❌ I can only help with Class 10 study-related questions.\n\nPlease ask something from your syllabus like:\n• Explain a concept\n• PYQs\n• Practice questions\n• Short notes"
    //     );
    //     document.getElementById('sendBtn').disabled = false;
    //     return;
    // }

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
    const topic = userMessage.trim();
    const mode = currentMode; // mode from UI selection

    // Build prompt based on mode + topic
    const prompt = buildPrompt(mode, topic);

    const response = await callAgentAPI(prompt);
    if (mode === "flowchart") {
        displayFlowchart(response);
    } else {
        displayResponse(response, mode);
    }
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

function buildPrompt(mode, topic) {
    const board = userPreferences.board;
    const subject = userPreferences.subject;

    const boardInfo = (board === "ICSE")
        ? "ICSE (Indian Certificate of Secondary Education)"
        : "CBSE (Central Board of Secondary Education)";

    if (mode === "pyq") {
        return `You are a ${boardInfo} Class 10 question paper generator for ${subject}.
Generate 3 previous year style questions for the topic: "${topic}".`;
    }

    if (mode === "concept") {
        return `Explain the concept "${topic}" to a ${board} Class 10 ${subject} student in simple terms.`;
    }

    if (mode === "practice") {
        return `Generate 3 practice questions with answers for Class 10 ${subject} on "${topic}".`;
    }

    if (mode === "notes") {
        return `Create short revision notes for Class 10 ${subject} on the topic "${topic}".`;
    }

    if (mode === "flowchart") {
        return `
    Create a well formatted Mermaid flowchart about topic "${topic}" with meaningful nodes.

    STRICT RULES:
    - MUST return only mermaid code block
    - MUST include \`\`\`mermaid and ending \`\`\`
    - Each connection must be on a NEW LINE
    - Use: flowchart TD
    - No explanations, no extra text
    Example output strictly like:
    \`\`\`mermaid
    flowchart TD
    Start --> Step1
    Step1 --> Step2
    Step2 --> End
    \`\`\`
    `;
    }



    // default fallback
    return `Explain "${topic}" simply for a Class 10 ${subject} student.`;
}


async function callAgentAPI(prompt) {
    try {
        const res = await fetch("https://study-agent-backend.onrender.com/api/agent", {
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
    if (mode === "flowchart") {
        renderMermaidFlowchart(response);
        return;
    }

    const formatted = formatByMode(response, mode);
    addAgentMessage(formatted, true, mode);
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

function addAgentMessage(text, isHTML = false, mode = currentMode) {
    const chatArea = document.getElementById('chatArea');
    const welcome = chatArea.querySelector('.welcome-message');
    if (welcome) welcome.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message agent';

    messageDiv.innerHTML = `
        <div class="avatar">AI</div>
        <div class="message-content">
            ${isHTML ? text : escapeHtml(text)}
        </div>
    `;

    chatArea.appendChild(messageDiv);
    chatArea.scrollTop = chatArea.scrollHeight;

    // ❗ Add PDF button ONLY if not flowchart mode
    if (mode !== "flowchart" && mode !== "adaptive") {
        const btn = document.createElement("button");
        btn.className = "pdf-btn";
        btn.textContent = "📄 Download PDF";
        btn.onclick = () => {
            let cleanText = convertHTMLToPlain(text);
            downloadPDF(cleanText);
        };
        messageDiv.querySelector(".message-content").appendChild(btn);
    }
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

function downloadPDF(content) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const lines = doc.splitTextToSize(content, 180);
    doc.text(lines, 10, 10);

    const filename = `boardmate_${Date.now()}.pdf`;
    doc.save(filename);
}

function convertHTMLToPlain(html) {
    return html
        .replace(/<\/?strong>/g, '')        // remove <strong>
        .replace(/<br\s*\/?>/gi, '\n')      // convert <br> to newline
        .replace(/<[^>]*>/g, '')            // remove remaining HTML tags
        .trim();
}

async function renderMermaid(response) {
    const codeMatch = response.match(/```mermaid([\s\S]*?)```/);
    if (!codeMatch) {
        addAgentMessage("❌ Invalid flowchart format");
        return;
    }

    const diagramCode = codeMatch[1].trim();

    const container = document.createElement("div");
    container.className = "mermaid-chart";
    container.innerHTML = diagramCode;

    // render diagram
    await mermaid.run({ querySelector: ".mermaid-chart" });

    // Create wrapper + download button
    const wrapper = document.createElement("div");
    wrapper.appendChild(container);

    const btn = document.createElement("button");
    btn.className = "flowchart-download-btn";
    btn.innerText = "📥 Download PNG";
    btn.onclick = () => downloadMermaidPNG(container);

    wrapper.appendChild(btn);

    addAgentMessage(wrapper.outerHTML, true);
}

async function downloadMermaidPNG(element) {
    const svg = element.querySelector("svg");
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const img = new Image();

    img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const link = document.createElement("a");
        link.download = `flowchart_${Date.now()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
}


async function downloadFlowchartAsPNG(element) {
    const node = element.cloneNode(true);
    node.querySelector(".flowchart-download-btn").remove();

    document.body.appendChild(node);
    const canvas = await html2canvas(node);
    document.body.removeChild(node);

    const link = document.createElement("a");
    link.download = `flowchart_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
}

function extractMermaid(text) {
    const match = text.match(/```mermaid([\s\S]*?)```/);
    return match ? match[1].trim() : null;
}

function displayFlowchart(aiText) {
    const code = extractMermaid(aiText);
    if (!code) {
        addAgentMessage("⚠️ Unable to generate valid flowchart. Try again.");
        return;
    }

    const id = "mermaid_" + Date.now();

    addAgentMessage(`<div id="${id}" class="flowchart-container">${code}</div>`, true);

    setTimeout(() => {
        mermaid.render(id + "_svg", code)
            .then(({ svg }) => {
                document.getElementById(id).innerHTML = svg;
                addDownloadButton(id);
            });
    }, 200);
}


function addDownloadButton(divId) {
    const div = document.getElementById(divId);
    const btn = document.createElement("button");
    btn.className = "download-btn";
    btn.innerText = "📥 Download PNG";
    btn.onclick = () => downloadFlowchart(div);
    div.appendChild(btn);
}

async function downloadFlowchart(div) {
    const svg = div.querySelector("svg");

    // Clone SVG for export
    const clone = svg.cloneNode(true);

    // 🟣 Fix width/height
    const bbox = svg.getBBox();
    clone.setAttribute("width", bbox.width);
    clone.setAttribute("height", bbox.height);
    clone.setAttribute("viewBox", `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);

    const xml = new XMLSerializer().serializeToString(clone);
    const img = new Image();

    img.onload = () => {
        const scale = 3; // HD SCALE
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext("2d");

        // White background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Scale before drawing
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);

        const link = document.createElement("a");
        link.download = "flowchart.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(xml);
}

////////////////////////////////////////////////////////////////////////////
async function startAdaptiveTest() {
    adaptiveTest.active = true;
    adaptiveTest.questions = [];
    adaptiveTest.currentIndex = 0;
    adaptiveTest.score = 0;
    adaptiveTest.wrongTopics = [];

    addAgentMessage("🧠 Adaptive Test Started!\nTotal Questions: " + adaptiveTest.total);

    await fetchAdaptiveQuestion();
}

async function fetchAdaptiveQuestion() {
    const prompt = `
Generate a Class 10 ${userPreferences.subject} MCQ with:
Topic, Question, 4 options A B C D and Correct option.
Format strictly:
Topic: <topic>
Q: <question>
A) <text>
B) <text>
C) <text>
D) <text>
Answer: <A/B/C/D>
`;

    // AI CALL
    const res = await callAgentAPI(prompt);

    const q = parseMCQ(res);
    adaptiveTest.questions.push(q);

    displayMCQ(q);
}

function parseMCQ(text) {
    return {
        topic: text.match(/Topic:\s*(.*)/)[1],
        question: text.match(/Q:\s*(.*)/)[1],
        A: text.match(/A\)\s*(.*)/)[1],
        B: text.match(/B\)\s*(.*)/)[1],
        C: text.match(/C\)\s*(.*)/)[1],
        D: text.match(/D\)\s*(.*)/)[1],
        answer: text.match(/Answer:\s*([A-D])/)[1]
    };
}

function displayMCQ(q) {
    addAgentMessage(
        `📍 Topic: ${q.topic}<br><br>
        ❓ ${q.question}<br><br>
        A) ${q.A}<br>
        B) ${q.B}<br>
        C) ${q.C}<br>
        D) ${q.D}<br><br>
        <div class="mcq-options" data-index="${adaptiveTest.currentIndex}">
            <button class="mcq-btn" data-opt="A" onclick="markAnswer('A', ${adaptiveTest.currentIndex})">A</button>
            <button class="mcq-btn" data-opt="B" onclick="markAnswer('B', ${adaptiveTest.currentIndex})">B</button>
            <button class="mcq-btn" data-opt="C" onclick="markAnswer('C', ${adaptiveTest.currentIndex})">C</button>
            <button class="mcq-btn" data-opt="D" onclick="markAnswer('D', ${adaptiveTest.currentIndex})">D</button>
        </div>
        `,
        true
    );
}

function markAnswer(opt, index) {
    // record answer
    adaptiveTest.userAnswers[index] = opt;

    

    // freeze current question buttons
    const container = document.querySelector(`.mcq-options[data-index="${index}"]`);
    if (container) {
        const btns = container.querySelectorAll(".mcq-btn");
        btns.forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.opt === opt) {
                btn.classList.add("selected");
            }
            btn.classList.add("disabled");
        });
    }

    // move next
    adaptiveTest.currentIndex++;

    if (adaptiveTest.currentIndex < adaptiveTest.total) {
        fetchAdaptiveQuestion();
    } else {
        finishAdaptiveTest();
    }
}


function finishAdaptiveTest() {
    adaptiveTest.active = false;

    let correct = 0;
    let analysis = "";

    adaptiveTest.questions.forEach((q, i) => {
        const userAns = adaptiveTest.userAnswers[i];
        const right = (userAns === q.answer);

        if (right) correct++;

        analysis += `
Q${i + 1}) 
Your Answer: ${userAns}
Correct Answer: ${q.answer}
Result: ${right ? "✔️ Correct" : "❌ Wrong"}
--------------------------
`;
    });

    const weak = summarizeWeak(adaptiveTest.wrongTopics);

    addAgentMessage(`
📊 <b>Test Completed!</b><br><br>
Score: ${correct}/${adaptiveTest.total}<br>
Accuracy: ${(correct / adaptiveTest.total * 100).toFixed(1)}%<br><br>
🧾 <b>Detailed Analysis:</b><br><pre>${analysis}</pre>
`, true);
}


function summarizeWeak(list) {
    const map = {};
    list.forEach(t => map[t] = (map[t] || 0) + 1);
    return Object.keys(map).sort((a, b) => map[b] - map[a]);
}


///////////////////////////////////////////////////////////////////////////


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


// === MOBILE NAVIGATION ===
const hamburger = document.querySelector(".hamburger-btn");
const modeMenu = document.querySelector(".mode-selector");

hamburger?.addEventListener("click", () => {
    if (modeMenu.style.display === "flex") {
        modeMenu.style.display = "none";
    } else {
        modeMenu.style.display = "flex";
        modeMenu.style.flexDirection = "column";
    }
});
