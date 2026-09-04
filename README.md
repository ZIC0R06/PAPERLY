# 📚 PAPERLY — AI Research Assistant

> An AI-powered research assistant designed to help students, researchers, and academics discover, understand, analyze, and learn from scientific literature.

PAPERLY combines **Large Language Models, Hugging Face, academic research APIs, NLP, and conversational AI** to provide an interactive platform for research and academic learning.

---

## 🚀 Features

### 🤖 AI Research Chat
- Ask questions about research topics and academic concepts.
- Get AI-generated explanations and research insights.
- Supports multiple AI personas:
  - 👨‍🏫 Professor
  - 🧑‍🎓 ELI5
  - 🔬 Researcher
  - ⚡ TL;DR
- Maintains conversation context for multi-turn interactions.

### 🔎 Academic Paper Search
Search and discover research papers from multiple academic sources:

- [ArXiv](https://arxiv.org/)
- [Semantic Scholar](https://www.semanticscholar.org/)
- [OpenAlex](https://openalex.org/)

Paper information includes:
- Paper title
- Authors
- Source
- Citation information
- Direct paper access
- AI-powered analysis

### 📝 AI Paper Summarization
Paste or select an academic paper and let PAPERLY generate an AI-powered summary.

Useful for:
- Quickly understanding research papers
- Extracting important concepts
- Reviewing literature
- Saving research time

### 🧠 Research Gap Finder
PAPERLY assists users in identifying potential research gaps by analyzing academic literature and generating AI-assisted insights.

### 🃏 AI Flashcard Generation
Automatically converts research content into flashcards for:

- Exam preparation
- Research learning
- Concept revision
- Knowledge retention

### 📄 Document Support
Upload:
- PDF documents
- TXT files

PAPERLY can use uploaded content as part of the research and learning workflow.

### 🎙️ Voice Interaction
- Voice input for asking questions.
- Text-to-speech for reading AI-generated responses aloud.

### 💬 Conversation History
- Maintains previous conversations.
- Allows users to revisit research discussions.
- Supports saving and clearing conversations.

---

## 🛠️ Tech Stack

### AI & Machine Learning
- Groq LLM
- Hugging Face
- Natural Language Processing (NLP)
- Prompt Engineering
- Generative AI

### Backend & APIs
- Python
- REST APIs
- Academic Research APIs
- Asynchronous API communication

### Frontend
- HTML5
- CSS3
- JavaScript
- Tailwind CSS
- Fetch API
- Dynamic UI Rendering

### Research APIs
- ArXiv API
- Semantic Scholar API
- OpenAlex API

---

## 🏗️ Architecture

```text
                    ┌─────────────────────┐
                    │      PAPERLY        │
                    │  AI Research App    │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
          ┌──────▼──────┐             ┌──────▼──────┐
          │   Frontend  │             │   Backend   │
          │ HTML/CSS/JS │◄───────────►│   Python    │
          └──────┬──────┘             └──────┬──────┘
                 │                           │
        ┌────────┴────────┐          ┌───────┴────────┐
        │                 │          │                │
   ┌────▼────┐       ┌────▼────┐ ┌──▼─────┐    ┌─────▼─────┐
   │ Research│       │Documents│ │ Groq   │    │ Hugging   │
   │  APIs   │       │ PDF/TXT │ │  LLM   │    │   Face    │
   └────┬────┘       └─────────┘ └──┬─────┘    └───────────┘
        │                            │
   ┌────▼────────────────────────────▼────┐
   │       AI Research Processing         │
   │ Summarization • Q&A • Flashcards    │
   │ Research Gaps • Concept Explanation  │
   └─────────────────────────────────────┘
