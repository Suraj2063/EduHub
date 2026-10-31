# EduHub — Next-Gen AI College Study Workspace & Lecture Hub 🎓

> **Transform dense college lecture notes and PDFs into interactive AI audio lectures, animated video presentations, and adaptive practice exams.**

EduHub is a full-stack MERN application built specifically for university and college students. It enables students to share, discover, and collaborate on course materials while using modern AI to convert static study documents into interactive multimodal learning experiences.

---

## ✨ Key Features

### 🎧 1. AI Spoken Audio Lectures & 24/7 AI Tutor
- Convert study notes and multi-page PDFs into thorough, university-grade audio lectures.
- **Dual-Language Neural Voiceover**: Choose between natural **English** and pure **Nepali (नेपाली)** audio narration.
- **Interactive AI Tutor**: Ask questions about any specific lecture segment in real time and receive spoken, context-aware audio explanations with practical examples.
- Background prefetching, playback speed toggles (0.75x to 2x), and chapter scrubbers.

### 🎬 2. AI Animated Video Lectures
- Synthesizes course materials into scene-by-scene 1080p animated visual slides.
- Synchronized voiceover narration with active audio equalizer waveform.
- Key concept highlight cards, takeaways, and chapter-based timeline scrubbers.
- In-modal AI Tutor for asking questions on individual video scenes.

### 📝 3. Adaptive AI Practice Quizzes
- Generate custom **5, 10, 15, or 20-question** multiple-choice practice exams directly from note contents.
- Detailed step-by-step reasoning for each answer choice.
- Instant score tracking and performance breakdown.

### 📄 4. Smart PDF Extraction & Scanned Note OCR
- **Digital PDFs**: Blazing-fast (<50ms) text extraction via `pdf-parse`.
- **Scanned & Handwritten Notes**: Automatic fallback to an OCR pipeline powered by Poppler (`pdftoppm`) and `Tesseract.js`.
- **Permanent MongoDB Caching**: Extracted and OCR-processed text is cached directly in the database, ensuring zero redundant processing.

### 🤝 5. Community Study Resource Hub
- Upload and filter peer-shared notes by academic discipline and course.
- In-browser PDF preview frames with direct cloud downloads via Cloudinary.
- Student accounts with secure JWT authentication, password reset with Gmail OTP, and profile management.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Vanilla CSS (Custom Design System), React Router v6, Axios |
| **Backend** | Node.js, Express.js (v5), MongoDB & Mongoose |
| **Cloud Storage** | Cloudinary (Secure document & avatar storage) |
| **AI Inference** | Groq SDK (Llama 3 / Mixtral for rapid JSON-structured generation) |
| **Voice Synthesis (TTS)** | Microsoft Edge Neural TTS & Piper Neural TTS Engine |
| **Document Processing** | `pdf-parse`, Poppler utilities (`pdftoppm`), `tesseract.js` |
| **Authentication** | JSON Web Tokens (JWT), Bcrypt.js, Nodemailer (OTP verification) |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017/eduhub`) or MongoDB Atlas URI
- **Poppler Utilities** (for PDF page rendering & OCR):
  - *Ubuntu / Debian*: `sudo apt-get install poppler-utils`
  - *Arch Linux*: `sudo pacman -S poppler`
  - *macOS*: `brew install poppler`

---

### Installation & Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/your-username/eduhub.git
cd eduhub
```

#### 2. Backend Setup
```bash
cd backend
npm install
```

Copy the environment variables template:
```bash
cp .env.example .env
```

Open `.env` and fill in your credentials:
```env
PORT=8000
MONGO_URI=mongodb://localhost:27017/eduhub
JWT_SECRET=your_super_secret_jwt_key
CLIENT_URL=http://localhost:5173

# Cloudinary (Free tier at https://cloudinary.com)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Gmail SMTP (For email OTP verification)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Groq AI (Free API key at https://console.groq.com)
GROQ_API_KEY=your_groq_api_key
```

Start the backend development server:
```bash
npm run dev
```
*The server will run on `http://localhost:8000`.*

---

#### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*The frontend client will run on `http://localhost:5173`.*

---

## 📁 Repository Structure

```
MERN_Project/
├── .github/                  # CI/CD workflows
├── .gitignore                # Comprehensive ignore rules (secrets, caches, models)
├── README.md                 # Project documentation
├── backend/
│   ├── .env.example          # Sample environment configuration
│   ├── index.js              # Express app entry point
│   ├── src/
│   │   ├── config/           # Cloudinary & database configuration
│   │   ├── middleware/       # JWT auth & error handling middleware
│   │   ├── routes/           # Auth, Resource, Audio, Video, Quiz routes
│   │   ├── schema/           # Mongoose schemas (User, Resource)
│   │   └── utils/            # Groq prompts, TTS synthesizer, OCR & PDF extractor
│   └── package.json
└── frontend/
    ├── index.html            # Single-page application root
    ├── src/
    │   ├── components/       # AudioLectureModal, VideoLectureModal, QuizModal, Navbar, Footer
    │   ├── pages/            # Home, ResourceDetail, UploadResource, Profile, Auth
    │   └── utils/            # Auth helpers, API endpoints
    ├── package.json
    └── vite.config.js
```

---

## 🔒 Security Best Practices

- **Never Commit `.env`**: Environment credentials, JWT secrets, and API keys are strictly excluded from version control via `.gitignore`. Always use `.env.example` as a template.
- **Passwords**: One-way encrypted with salted `bcryptjs` hashing.
- **Zero Local Artifact Leaks**: Transient audio streams and OCR render frames are automatically cleaned up from `/tmp` upon completion.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
