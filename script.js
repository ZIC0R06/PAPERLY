// ─── Particle System ──────────────────────────────────────────────────────────

(function initParticles() {
    var canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    var W, H, particles = [];
    var COLORS = ['rgba(200,169,126,', 'rgba(212,168,83,', 'rgba(139,111,78,', 'rgba(232,201,154,'];

    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }

    function randBetween(a, b) { return a + Math.random() * (b - a); }

    function createParticle() {
        var c = COLORS[Math.floor(Math.random() * COLORS.length)];
        return {
            x:     randBetween(0, W),
            y:     randBetween(0, H),
            r:     randBetween(0.4, 1.6),
            alpha: randBetween(0.1, 0.5),
            dx:    randBetween(-0.15, 0.15),
            dy:    randBetween(-0.25, -0.05),
            color: c
        };
    }

    function init() {
        resize();
        particles = [];
        for (var i = 0; i < 90; i++) particles.push(createParticle());
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color + p.alpha + ')';
            ctx.fill();

            p.x += p.dx;
            p.y += p.dy;
            p.alpha -= 0.0008;

            if (p.y < -5 || p.alpha <= 0) {
                particles[i] = createParticle();
                particles[i].y = H + 5;
            }
        }
        requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    init();
    draw();
})();
console.log("Paperly loaded ✓");
 // Personas
var currentPersona = 'professor';

const PERSONAS = {
  professor: `You are a formal academic professor helping with research. Give deep structured explanations with examples. Use academic tone.`,
  eli5: `Explain everything like the user is 5 years old. Use very simple words, fun analogies, zero jargon. Keep it friendly.`,
  researcher: `You are a technical research expert. Be precise, mention methodologies, use technical terminology.`,
  tldr: `Always respond in maximum 3-4 bullet points only. Be extremely concise. No intro, no fluff.`
};

function setPersona(name) {
  currentPersona = name;
  document.querySelectorAll('.persona-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('p-' + name).classList.add('active');
}
// Typing Sound
function playTypingSound() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.1);
}
var conversationHistory = [];
var isThinking = false;
 
// ─── View switching ───────────────────────────────────────────────────────────
 
function showView(name) {
    document.querySelectorAll('.view').forEach(function(v) {
        v.classList.remove('active');
    });
    var el = document.getElementById(name + 'View');
    if (el) el.classList.add('active');
    if (name === 'history') renderHistory();
}
 
// ─── Chat ─────────────────────────────────────────────────────────────────────
 
function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}
 
function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}
 
function sendSuggestion(text) {
    document.getElementById('chatInput').value = text;
    sendMessage();
}
 
function clearChat() {
    conversationHistory = [];
    var messages = document.getElementById('messages');
    messages.innerHTML =
        '<div class="message assistant">' +
            '<div class="msg-avatar">P</div>' +
            '<div class="msg-content">' +
                '<div class="msg-bubble">Conversation cleared. How can I help you with your research?</div>' +
                '<div class="msg-time">Just now</div>' +
            '</div>' +
        '</div>';
}
 
async function sendMessage() {
    if (isThinking) return;
 
    var input = document.getElementById('chatInput');
    var text  = input.value.trim();
    if (!text) return;
 
    input.value = '';
    input.style.height = 'auto';
 
    appendMessage('user', text);
    conversationHistory.push({ role: 'user', content: text });
 
    showTyping();
    isThinking = true;
    document.getElementById('sendBtn').disabled = true;
 
    try {
        var replyText = await getChatReply(text);
        removeTyping();
        appendMessage('assistant', replyText);
        conversationHistory.push({ role: 'assistant', content: replyText });
    } catch (err) {
        console.error('Chat error:', err);
        removeTyping();
        appendMessage('assistant', 'Sorry, something went wrong. Please make sure the server is running on port 5000.');
    }
 
    isThinking = false;
    document.getElementById('sendBtn').disabled = false;
}
 
async function getChatReply(userMessage) {
    try {
        var response = await fetch('http://127.0.0.1:5000/chat', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ 
                messages: conversationHistory, 
                system: PERSONAS[currentPersona] 
            })
        });

        if (!response.ok) {
            var errText = await response.text();
            console.error("Server error response:", errText);
            throw new Error('Server error: ' + response.status);
        }

        var data = await response.json();
        
        if (!data.reply) {
            console.error("No reply in response:", data);
            throw new Error('No reply from server');
        }
        
        return data.reply;
    } catch(err) {
        console.error("getChatReply failed:", err);
        throw err;
    }
}
 
function appendMessage(role, text) {
    if (role === 'assistant') playTypingSound(); 
    var messages = document.getElementById('messages');
 
    var avatar  = role === 'assistant' ? 'P' : 'U';
    var timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
 
    // Convert markdown-like formatting to HTML
    var formatted = formatText(text);
    var speakBtn = role === 'assistant'
        ? '<button class="speak-btn" onclick="speakText(this)" data-text="' + text.replace(/"/g, '&quot;') + '" title="Read aloud">🔊</button>'
        : '';
    var div = document.createElement('div');
    div.className = 'message ' + role;
    div.innerHTML =
             '<div class="msg-avatar">' + avatar + '</div>' +
    '<div class="msg-content">' +
        '<div class="msg-bubble">' + formatted + '</div>' +
        '<div class="msg-meta">' +
            '<div class="msg-time">' + timeStr + '</div>' +
            speakBtn +
        '</div>' +
    '</div>';

 
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;

if (role === 'assistant') {
    generateFollowUps(text, div);
}
}
 
function showTyping() {
    var messages = document.getElementById('messages');
    var div = document.createElement('div');
    div.className = 'message assistant typing-indicator';
    div.id = 'typingIndicator';
    div.innerHTML =
        '<div class="msg-avatar">P</div>' +
        '<div class="msg-content">' +
            '<div class="msg-bubble"><div class="dots"><span></span><span></span><span></span></div></div>' +
        '</div>';
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}
 
function removeTyping() {
    var el = document.getElementById('typingIndicator');
    if (el) el.remove();
}
 
function formatText(text) {
    // Bold **text**
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Inline code `code`
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bullet points - convert lines starting with - or * to list items
    var lines = text.split('\n');
    var html = '';
    var inList = false;
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (/^[-*]\s/.test(line)) {
            if (!inList) { html += '<ul class="msg-list">'; inList = true; }
            html += '<li>' + line.replace(/^[-*]\s/, '') + '</li>';
        } else {
            if (inList) { html += '</ul>'; inList = false; }
            if (line.trim()) html += '<p>' + line + '</p>';
        }
    }
    if (inList) html += '</ul>';
    return html;
}
 
// ─── Search ───────────────────────────────────────────────────────────────────
 
async function searchPapers() {
    var query = document.getElementById('searchInput').value.trim();
    if (!query) { alert('Please enter a search term.'); return; }

    var resultsSection = document.getElementById('resultsSection');
    var resultsDiv     = document.getElementById('results');

    resultsSection.classList.remove('hidden');
    resultsDiv.innerHTML = '<p style="text-align:center;color:#6b6b6b;padding:40px;grid-column:span 2;font-family:DM Mono,monospace;font-size:13px">Searching ArXiv, Semantic Scholar & OpenAlex...</p>';

    try {
        var response = await fetch('http://127.0.0.1:5000/search?q=' + encodeURIComponent(query));
        var papers   = await response.json();

        if (!papers.length) {
            resultsDiv.innerHTML = '<p style="text-align:center;color:#6b6b6b;padding:40px;grid-column:span 2">No results found.</p>';
            return;
        }

        var html = '';
        for (var i = 0; i < papers.length; i++) {
            var paper    = papers[i];
            var encSum   = encodeURIComponent(paper.summary || '');
            var encTitle = encodeURIComponent(paper.title || '');

            var badgeColor = paper.source === 'ArXiv' ? '#a78bfa' :
                             paper.source === 'Semantic Scholar' ? '#67e8f9' : '#4ade80';

            html +=
                '<div class="paper-card">' +
                    '<div class="paper-source-badge" style="color:' + badgeColor + ';border-color:' + badgeColor + '20">' +
                        paper.source +
                    '</div>' +
                    '<h3>' + escapeHtml(paper.title.trim()) + '</h3>' +
                    '<p>' + escapeHtml((paper.summary || '').trim().substring(0, 200)) + '...</p>' +
                    (paper.citationCount !== undefined ?
                        '<div class="citation-badge">📄 Cited by ' + paper.citationCount.toLocaleString() + ' papers</div>' : '') +
                    '<div class="card-actions">' +
                        '<a href="' + paper.link + '" target="_blank">Read →</a>' +
                        '<button class="btn-summarize" onclick="openSummarize(\'' + encSum + '\',\'' + encTitle + '\')">✦ Summarize</button>' +
                        '<button class="btn-flashcard" onclick="openFlashcards(\'' + encSum + '\',\'' + encTitle + '\')">⟐ Flashcards</button>' +
                    '</div>' +
                '</div>';
        }
        resultsDiv.innerHTML = html;

    } catch (err) {
        console.error('Search error:', err);
        resultsDiv.innerHTML = '<p style="text-align:center;color:#f87171;padding:40px;grid-column:span 2">Error. Make sure server is running on port 5000.</p>';
    }
}
// ─── Modal ────────────────────────────────────────────────────────────────────
 
function openModal(title, bodyHtml) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML    = bodyHtml;
    document.getElementById('aiModal').classList.add('open');
}
 
function closeModal() {
    document.getElementById('aiModal').classList.remove('open');
}
 
function spinnerHtml(msg) {
    return '<div class="spinner-wrap"><div class="spinner"></div><div class="spinner-text">' + msg + '</div></div>';
}
 
// ─── Summarize ────────────────────────────────────────────────────────────────
 
async function openSummarize(encSum, encTitle) {
    var text  = decodeURIComponent(encSum);
    var title = decodeURIComponent(encTitle);
 
    openModal('✦ AI Summary', spinnerHtml('Summarizing paper...'));
 
    try {
        var response = await fetch('http://127.0.0.1:5000/summarize', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ text: text })
        });
        var data    = await response.json();
        console.log("Frontend received summary:", data);
        var summary =
            data.summary ||
            (data[0] && data[0].summary_text) ||
            'Could not generate summary.';
 
        openModal('✦ AI Summary',
            '<p style="color:#a78bfa;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;font-family:DM Mono,monospace">Summary</p>' +
            '<p style="color:#f0ede8;font-size:14px;font-weight:500;margin-bottom:14px;line-height:1.5">' + escapeHtml(title) + '</p>' +
            '<p style="color:#9a9a9a;font-size:14px;line-height:1.7">' + escapeHtml(summary) + '</p>'
        );
    } catch (err) {
        openModal('✦ AI Summary', '<p style="color:#f87171">Failed to summarize. Check server.</p>');
    }
}
 
// ─── Flashcards ───────────────────────────────────────────────────────────────
 
async function openFlashcards(encSum, encTitle) {
    var text = decodeURIComponent(encSum);
    var title = decodeURIComponent(encTitle);

    openModal('⟐ Flashcards', spinnerHtml('Generating flashcards...'));

    try {
        var response = await fetch('http://127.0.0.1:5000/flashcards', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                title: title
            })
        });

        if (!response.ok) {
            throw new Error("Server error: " + response.status);
        }

        var data = await response.json();

        console.log("FLASHCARD RESPONSE:", data);

        var flashcards = data.flashcards || [];

        if (!Array.isArray(flashcards) || flashcards.length === 0) {
            flashcards = [
                {
                    question: "Generation Error",
                    answer: "No flashcards were generated."
                }
            ];
        }

        var html =
            '<p style="color:#67e8f9;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:16px;font-family:DM Mono,monospace">' +
            flashcards.length +
            ' cards generated</p>';

        for (var i = 0; i < flashcards.length; i++) {
            var card = flashcards[i];

            html +=
                '<div class="fc-card">' +
                    '<div class="fc-q">' +
                        '<div class="fc-q-label">Q' + (i + 1) + '</div>' +
                        '<div class="fc-q-text">' + escapeHtml(card.question || "No question") + '</div>' +
                    '</div>' +

                    '<div class="fc-a">' +
                        '<button class="fc-reveal" id="fcBtn' + i + '" onclick="toggleFc(' + i + ')">' +
                            'Reveal answer ↓' +
                        '</button>' +

                        '<div class="fc-answer" id="fcAns' + i + '" style="display:none;">' +
                            '<div class="fc-a-label">Answer</div>' +
                            '<div class="fc-a-text">' +
                                escapeHtml(card.answer || "No answer available") +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
        }

        openModal('⟐ Flashcards', html);

    } catch (err) {
        console.error("Flashcard frontend error:", err);

        openModal(
            '⟐ Flashcards',
            '<p style="color:#f87171">Failed to generate flashcards. Please check backend server.</p>'
        );
    }
}
 
function toggleFc(i) {
    var ans = document.getElementById('fcAns' + i);
    var btn = document.getElementById('fcBtn' + i);
    var showing = ans.style.display === 'block';
    ans.style.display = showing ? 'none' : 'block';
    btn.textContent   = showing ? 'Reveal answer ↓' : 'Hide answer ↑';
}
 
// ─── Utility ──────────────────────────────────────────────────────────────────
 
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
// ─── Voice Input ──────────────────────────────────────────────────────────────

var recognition = null;
var isListening = false;

function toggleVoice() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        alert('Your browser does not support voice input. Try Chrome or Edge.');
        return;
    }

    if (isListening) {
        recognition.stop();
        return;
    }

    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = function () {
        isListening = true;
        document.getElementById('micBtn').classList.add('mic-active');
    };

    recognition.onresult = function (event) {
        var transcript = event.results[0][0].transcript;
        var input = document.getElementById('chatInput');
        input.value = transcript;
        autoResize(input);
    };

    recognition.onend = function () {
        isListening = false;
        document.getElementById('micBtn').classList.remove('mic-active');
    };

    recognition.onerror = function (event) {
        isListening = false;
        document.getElementById('micBtn').classList.remove('mic-active');
        console.error('Voice error:', event.error);
    };

    recognition.start();
}

// ─── Text-to-Speech ───────────────────────────────────────────────────────────

var currentUtterance = null;

function speakText(btn) {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        document.querySelectorAll('.speak-btn').forEach(function(b) {
            b.textContent = '🔊';
        });
        if (btn.dataset.speaking === 'true') {
            btn.dataset.speaking = 'false';
            return;
        }
    }

    var rawText = btn.dataset.text;
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawText;
    var plainText = tempDiv.textContent || tempDiv.innerText || rawText;

    var utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate  = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    var voices = window.speechSynthesis.getVoices();
    var preferred = voices.find(function(v) {
        return v.name.includes('Google') || v.name.includes('Natural') || v.lang === 'en-US';
    });
    if (preferred) utterance.voice = preferred;

    utterance.onstart = function() {
        btn.textContent = '⏹';
        btn.dataset.speaking = 'true';
    };
    utterance.onend = function() {
        btn.textContent = '🔊';
        btn.dataset.speaking = 'false';
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
}
// ─── Chat History ─────────────────────────────────────────────────────────────

function saveChat() {
    if (conversationHistory.length === 0) {
        alert('Nothing to save yet! Start a conversation first.');
        return;
    }

    var name = prompt('Name this conversation:', 'Chat ' + new Date().toLocaleDateString());
    if (!name || name.trim() === '') return;

    var chats = getSavedChats();
    var chat = {
        id:       Date.now(),
        name:     name.trim(),
        date:     new Date().toLocaleString(),
        preview:  conversationHistory[0].content.substring(0, 80) + '...',
        messages: conversationHistory
    };

    chats.unshift(chat);
    localStorage.setItem('paperly_chats', JSON.stringify(chats));
    alert('Conversation saved as "' + name.trim() + '"!');
}

function getSavedChats() {
    try {
        return JSON.parse(localStorage.getItem('paperly_chats')) || [];
    } catch (e) {
        return [];
    }
}

function renderHistory() {
    var chats = getSavedChats();
    var list  = document.getElementById('historyList');

    if (chats.length === 0) {
        list.innerHTML =
            '<div class="history-empty">' +
                '<div class="history-empty-icon">◎</div>' +
                '<p>No saved conversations yet.</p>' +
                '<p>Start chatting and hit "Save conversation" to see them here.</p>' +
            '</div>';
        return;
    }

    var html = '';
    for (var i = 0; i < chats.length; i++) {
        var chat = chats[i];
        html +=
            '<div class="history-card">' +
                '<div class="history-card-top">' +
                    '<div class="history-card-name">' + escapeHtml(chat.name) + '</div>' +
                    '<button class="history-delete" onclick="deleteChat(' + chat.id + ')">🗑</button>' +
                '</div>' +
                '<div class="history-card-preview">' + escapeHtml(chat.preview) + '</div>' +
                '<div class="history-card-footer">' +
                    '<span class="history-card-date">' + chat.date + '</span>' +
                    '<button class="history-open" onclick="openChat(' + chat.id + ')">Open →</button>' +
                '</div>' +
            '</div>';
    }
    list.innerHTML = html;
}

function deleteChat(id) {
    if (!confirm('Delete this conversation?')) return;
    var chats = getSavedChats().filter(function(c) { return c.id !== id; });
    localStorage.setItem('paperly_chats', JSON.stringify(chats));
    renderHistory();
}

function openChat(id) {
    var chats   = getSavedChats();
    var chat    = chats.find(function(c) { return c.id === id; });
    if (!chat) return;

    document.getElementById('readerTitle').textContent = chat.name;

    var html = '';
    for (var i = 0; i < chat.messages.length; i++) {
        var msg    = chat.messages[i];
        var isUser = msg.role === 'user';
        html +=
            '<div class="reader-msg ' + (isUser ? 'reader-user' : 'reader-assistant') + '">' +
                '<div class="reader-role">' + (isUser ? 'You' : 'Paperly') + '</div>' +
                '<div class="reader-text">' + escapeHtml(msg.content) + '</div>' +
            '</div>';
    }

    document.getElementById('readerBody').innerHTML = html;
    document.getElementById('readerModal').classList.add('open');
}

function closeReader() {
    document.getElementById('readerModal').classList.remove('open');
}
// ─── Follow-up Questions ──────────────────────────────────────────────────────

async function generateFollowUps(responseText, messageDiv) {
    try {
        const response = await fetch('http://127.0.0.1:5000/followups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: responseText })
        });

        if (!response.ok) return;

        const data = await response.json();
        const questions = data.questions || [];

        if (!questions.length) return;

        const container = document.createElement('div');
        container.className = 'followup-container';

        questions.forEach(function(q) {
            const btn = document.createElement('button');
            btn.className = 'followup-btn';
            btn.textContent = q;
            btn.onclick = function() {
                document.getElementById('chatInput').value = q;
                sendMessage();
                container.remove();
            };
            container.appendChild(btn);
        });

        var bubble = messageDiv.querySelector('.msg-bubble');
        if (bubble) bubble.appendChild(container);

    } catch(err) {
        console.error('Follow-up error:', err);
    }
}
// ─── News ─────────────────────────────────────────────────────────────────────

async function loadNews() {
    var container = document.getElementById('newsContainer');
    if (!container) return;

    try {
        var response = await fetch('http://127.0.0.1:5000/news?q=artificial+intelligence+research');
        var data = await response.json();
        var articles = data.articles || [];

        if (articles.length === 0) {
            container.innerHTML = '<p style="font-size:11px;color:#6b6b6b;">No news found.</p>';
            return;
        }

        var html = '';
        for (var i = 0; i < articles.length; i++) {
            var article = articles[i];
            html +=
                '<a href="' + article.url + '" target="_blank" class="news-item">' +
                    '<div class="news-title">' + escapeHtml(article.title.substring(0, 60)) + '...</div>' +
                    '<div class="news-source">' + escapeHtml(article.source.name) + ' · ' + new Date(article.publishedAt).toLocaleDateString() + '</div>' +
                '</a>';
        }
        container.innerHTML = html;

    } catch(err) {
        container.innerHTML = '<p style="font-size:11px;color:#6b6b6b;">Could not load news.</p>';
    }
}

// Load news on page load
window.addEventListener('load', function() {
    setTimeout(loadNews, 1000);
});
// ─── Research Gap Finder ──────────────────────────────────────────────────────
async function findGaps() {
    var topic = document.getElementById('gapInput').value.trim();
    if (!topic) { alert('Please enter a research topic!'); return; }

    var results = document.getElementById('gapResults');
    results.classList.remove('hidden');
    results.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div><div class="spinner-text">Analyzing research landscape...</div></div>';

    try {
        var response = await fetch('http://127.0.0.1:5000/gapfinder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: topic })
        });

        var data = await response.json();
        var gaps = data.gaps || [];
        var hotAreas = data.hotAreas || [];
        var suggestedTopics = data.suggestedTopics || [];

        var html = '';

        // Export button at top
        html += '<div style="display:flex;justify-content:flex-end;margin-bottom:20px">' +
            '<button onclick="exportGapPDF()" style="background:linear-gradient(135deg,#d4a853,#c8a97e);color:#0a0a0a;border:none;border-radius:10px;padding:10px 22px;font-family:Outfit,sans-serif;font-size:13px;font-weight:500;cursor:pointer;box-shadow:0 4px 16px rgba(200,169,126,0.3)">⬇ Export as PDF</button>' +
        '</div>';

        // Store data for PDF export
        window._gapData = { topic: topic, gaps: gaps, hotAreas: hotAreas, suggestedTopics: suggestedTopics };

        html += '<div class="gap-section-label">🔍 Research Gaps Found — Ranked by Priority</div>';

        for (var i = 0; i < gaps.length; i++) {
            var gap = gaps[i];
            var questions   = gap.researchQuestions || [];
            var papers      = gap.relatedPapers || [];
            var priority    = gap.priority || 'Medium';
            var score       = gap.priorityScore || 70;
            var methodology = gap.methodology || null;

            var priorityColor = priority === 'High' ? '#f87171' :
                                priority === 'Medium' ? '#fbbf24' : '#4ade80';
            var priorityEmoji = priority === 'High' ? '🔴' :
                                priority === 'Medium' ? '🟡' : '🟢';

            var methIcon = '🔬';
            if (methodology) {
                if (methodology.type === 'ML Model') methIcon = '🤖';
                else if (methodology.type === 'Literature Review') methIcon = '📚';
                else if (methodology.type === 'Survey') methIcon = '📊';
                else if (methodology.type === 'Clinical Study') methIcon = '🏥';
                else if (methodology.type === 'Experiment') methIcon = '⚗️';
            }

            html +=
                '<div class="gap-card" style="flex-direction:column;border-left:3px solid ' + priorityColor + '">' +

                    '<div style="display:flex;gap:20px;align-items:flex-start">' +
                        '<div class="gap-card-num">0' + (i + 1) + '</div>' +
                        '<div class="gap-card-body" style="flex:1">' +

                            '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px">' +
                                '<div class="gap-card-title" style="margin-bottom:0">' + escapeHtml(gap.title) + '</div>' +
                                '<span style="font-size:12px;font-family:DM Mono,monospace;color:' + priorityColor + ';border:1px solid ' + priorityColor + '40;background:' + priorityColor + '12;padding:4px 12px;border-radius:20px;white-space:nowrap">' +
                                    priorityEmoji + ' ' + priority + ' Priority' +
                                '</span>' +
                            '</div>' +

                            '<div style="margin-bottom:12px">' +
                                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
                                    '<span style="font-size:10px;font-family:DM Mono,monospace;color:#6b6b6b;text-transform:uppercase;letter-spacing:0.08em">Priority Score</span>' +
                                    '<span style="font-size:12px;font-family:DM Mono,monospace;color:' + priorityColor + ';font-weight:500">' + score + '%</span>' +
                                '</div>' +
                                '<div style="height:4px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden">' +
                                    '<div style="height:100%;width:' + score + '%;background:linear-gradient(90deg,' + priorityColor + '80,' + priorityColor + ');border-radius:4px"></div>' +
                                '</div>' +
                            '</div>' +

                            '<div class="gap-card-desc">' + escapeHtml(gap.description) + '</div>' +
                            '<div class="gap-opportunity"><span class="gap-opp-label">💡 Opportunity: </span>' + escapeHtml(gap.opportunity) + '</div>' +
                        '</div>' +
                    '</div>' +

                    // Methodology
                    (methodology ?
                    '<div style="margin-top:16px;padding:14px;background:rgba(212,168,83,0.05);border:1px solid rgba(212,168,83,0.2);border-radius:10px">' +
                        '<div style="font-size:11px;font-family:DM Mono,monospace;color:#d4a853;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px">' +
                            methIcon + ' Suggested Methodology — ' + (methodology.type || '') +
                        '</div>' +
                        '<div style="font-size:13px;color:#c8a97e;font-weight:500;margin-bottom:10px">' + escapeHtml(methodology.approach || '') + '</div>' +
                        (methodology.steps && methodology.steps.length ?
                        '<div style="display:flex;flex-direction:column;gap:6px">' +
                            methodology.steps.map(function(step, si) {
                                return '<div style="display:flex;align-items:flex-start;gap:10px;font-size:12px;color:#9a9a9a;line-height:1.5">' +
                                    '<span style="flex-shrink:0;width:20px;height:20px;border-radius:50%;background:rgba(212,168,83,0.15);border:1px solid rgba(212,168,83,0.3);display:flex;align-items:center;justify-content:center;font-size:10px;font-family:DM Mono,monospace;color:#d4a853">' + (si+1) + '</span>' +
                                    '<span>' + escapeHtml(step) + '</span>' +
                                '</div>';
                            }).join('') +
                        '</div>' : '') +
                    '</div>' : '') +

                    // Research Questions
                    (questions.length ?
                    '<div style="margin-top:12px;padding:14px;background:rgba(167,139,250,0.06);border:1px solid rgba(167,139,250,0.2);border-radius:10px">' +
                        '<div style="font-size:11px;font-family:DM Mono,monospace;color:#a78bfa;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px">📋 Research Questions for your Thesis</div>' +
                        questions.map(function(q, qi) {
                            return '<div style="font-size:13px;color:#c8c8e8;padding:6px 0;border-bottom:1px solid rgba(167,139,250,0.1);line-height:1.6">' +
                                '<span style="color:#a78bfa;font-family:DM Mono,monospace;font-size:11px">Q' + (qi+1) + ' </span>' +
                                escapeHtml(q) +
                            '</div>';
                        }).join('') +
                    '</div>' : '') +

                    // Related Papers
                    (papers.length ?
                    '<div style="margin-top:12px;padding:14px;background:rgba(103,232,249,0.04);border:1px solid rgba(103,232,249,0.15);border-radius:10px">' +
                        '<div style="font-size:11px;font-family:DM Mono,monospace;color:#67e8f9;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px">📄 Related Papers (' + papers.length + ' found on ArXiv)</div>' +
                        papers.map(function(paper) {
                            return '<a href="' + paper.link + '" target="_blank" style="display:block;font-size:12px;color:#9a9a9a;padding:6px 0;border-bottom:1px solid rgba(103,232,249,0.08);text-decoration:none;line-height:1.5" onmouseover="this.style.color=\'#67e8f9\'" onmouseout="this.style.color=\'#9a9a9a\'">' +
                                '<span style="color:#67e8f9;font-family:DM Mono,monospace;font-size:10px">' + (paper.year || '') + ' </span>' +
                                escapeHtml(paper.title) + ' →' +
                            '</a>';
                        }).join('') +
                    '</div>' : '') +

                '</div>';
        }

        // Hot Areas
        if (hotAreas.length) {
            html += '<div class="gap-section-label" style="margin-top:32px">🔥 Hot Research Areas</div>';
            html += '<div class="gap-chips">';
            for (var j = 0; j < hotAreas.length; j++) {
                html += '<span class="gap-chip hot">' + escapeHtml(hotAreas[j]) + '</span>';
            }
            html += '</div>';
        }

        // Suggested Topics
        if (suggestedTopics.length) {
            html += '<div class="gap-section-label" style="margin-top:24px">✨ Suggested Research Topics</div>';
            html += '<div class="gap-chips">';
            for (var k = 0; k < suggestedTopics.length; k++) {
                html += '<span class="gap-chip suggest" onclick="document.getElementById(\'gapInput\').value=\'' + escapeHtml(suggestedTopics[k]) + '\';findGaps()">' + escapeHtml(suggestedTopics[k]) + '</span>';
            }
            html += '</div>';
        }

        results.innerHTML = html;

    } catch (err) {
        console.error('Gap finder error:', err);
        results.innerHTML = '<p style="color:#f87171;text-align:center;padding:40px">Error. Make sure server is running.</p>';
    }
}

// ─── File Upload ──────────────────────────────────────────────────────────────

async function handleFileUpload(event) {
    var file = event.target.files[0];
    if (!file) return;

    // Show file name in chat
    appendMessage('user', '📎 Uploaded: ' + file.name);

    // Show typing
    showTyping();
    isThinking = true;
    document.getElementById('sendBtn').disabled = true;

    try {
        var formData = new FormData();
        formData.append('file', file);

        var response = await fetch('http://127.0.0.1:5000/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');

        var data = await response.json();

        removeTyping();
        appendMessage('assistant', 
            '📄 **' + file.name + '**\n\n' + data.analysis
        );

        // Add to conversation history
        conversationHistory.push({ role: 'user', content: 'Analyze this paper: ' + file.name });
        conversationHistory.push({ role: 'assistant', content: data.analysis });

    } catch (err) {
        console.error('Upload error:', err);
        removeTyping();
        appendMessage('assistant', 'Sorry, could not analyze the file. Make sure server is running.');
    }

    isThinking = false;
    document.getElementById('sendBtn').disabled = false;

    // Reset file input
    event.target.value = '';
}
// ─── Export Gap Report as PDF ─────────────────────────────────────────────────

function exportGapPDF() {
    var data = window._gapData;
    if (!data) { alert('No gap data to export!'); return; }

    var content = '';
    var date = new Date().toLocaleDateString();

    content += 'PAPERLY — RESEARCH GAP REPORT\n';
    content += '================================\n';
    content += 'Topic: ' + data.topic + '\n';
    content += 'Generated: ' + date + '\n\n';

    content += 'RESEARCH GAPS FOUND\n';
    content += '-------------------\n\n';

    for (var i = 0; i < data.gaps.length; i++) {
        var gap = data.gaps[i];
        var priority = gap.priority || 'Medium';
        var score    = gap.priorityScore || 70;

        content += (i + 1) + '. ' + gap.title + '\n';
        content += '   Priority: ' + priority + ' (' + score + '%)\n\n';
        content += 'Description:\n' + gap.description + '\n\n';
        content += 'Opportunity:\n' + gap.opportunity + '\n\n';

        if (gap.methodology) {
            content += 'Suggested Methodology:\n';
            content += '  Type: ' + (gap.methodology.type || '') + '\n';
            content += '  Approach: ' + (gap.methodology.approach || '') + '\n';
            if (gap.methodology.steps && gap.methodology.steps.length) {
                content += '  Steps:\n';
                for (var s = 0; s < gap.methodology.steps.length; s++) {
                    content += '    ' + (s+1) + '. ' + gap.methodology.steps[s] + '\n';
                }
            }
            content += '\n';
        }

        if (gap.researchQuestions && gap.researchQuestions.length) {
            content += 'Research Questions:\n';
            for (var q = 0; q < gap.researchQuestions.length; q++) {
                content += '  Q' + (q+1) + ': ' + gap.researchQuestions[q] + '\n';
            }
            content += '\n';
        }

        if (gap.relatedPapers && gap.relatedPapers.length) {
            content += 'Related Papers on ArXiv:\n';
            for (var p = 0; p < gap.relatedPapers.length; p++) {
                content += '  - ' + (gap.relatedPapers[p].year ? '[' + gap.relatedPapers[p].year + '] ' : '') + gap.relatedPapers[p].title + '\n';
                content += '    ' + gap.relatedPapers[p].link + '\n';
            }
            content += '\n';
        }

        content += '================================\n\n';
    }

    if (data.hotAreas && data.hotAreas.length) {
        content += 'HOT RESEARCH AREAS\n';
        content += '------------------\n';
        content += data.hotAreas.join(', ') + '\n\n';
    }

    if (data.suggestedTopics && data.suggestedTopics.length) {
        content += 'SUGGESTED RESEARCH TOPICS\n';
        content += '-------------------------\n';
        content += data.suggestedTopics.join(', ') + '\n\n';
    }

    content += '\nGenerated by Paperly — AI Research Assistant\n';
    content += 'paperly-s6a9.onrender.com\n';

    var blob = new Blob([content], { type: 'text/plain' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = 'paperly-gap-report-' + data.topic.replace(/\s+/g, '-').toLowerCase() + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}