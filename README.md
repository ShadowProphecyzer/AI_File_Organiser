AI_File_Organiser

Project Description
--------------------
AI_File_Organiser allows users to input any text-based file types (PDF, DOCX, TXT, etc.) and automatically sorts them into organised folders.
It solves the problem of messy digital file management, making organisation effortless.

Key Highlights
--------------
- Project Name: AI_File_Organiser
- Purpose: Automatic organisation of text-based files
- Target Users: Anyone lacking the time, energy, or willingness to organise their digital files

Prerequisites
-------------
- Node.js: Recommended version 16+
- npm: Node.js package manager
- MongoDB: Local instance or MongoDB Atlas
- Environment Variables (.env):
  - MONGO_DB: MongoDB connection string (e.g. mongodb://localhost:27017/your-db)
  - PORT: (optional) Server port (defaults to 3000)
  - AI_COMPLETION_URL: AI completion API endpoint (e.g. OpenAI endpoint)
  - AI_MODEL: AI model name (e.g. gpt-3.5-turbo)
  - AI_API_KEY: API key for AI service

Installation & Setup
---------------------
1. Clone the repository:
   git clone https://github.com/ShadowProphecyzer/Project-2.git
   cd Project-2

2. Install dependencies:
   npm install

3. Configure environment variables:
   Create a .env file in the project root:
     MONGO_DB=your_mongodb_connection_string
     PORT=3000
     AI_COMPLETION_URL=https://api.openai.com/v1/chat/completions
     AI_MODEL=gpt-4o
     AI_API_KEY=your_openai_api_key

4. Start the server:
   npm start

   For development:
   npm run dev

Usage
-----
Users interact with AI_File_Organiser via their browser over HTTPS:

1. Navigate to the hosted URL (e.g. https://localhost:3000).
2. Log in or sign up (if user authentication is enabled).
3. Upload text-based files (e.g. .pdf, .docx, .txt).
4. View automatically organised files in their respective folders.
5. **Download files:** Click on any file in the explorer to download it directly to your device.

Features
--------
- Automatic Categorisation: Organises uploaded files into appropriate folders based on content.
- Multi-User Support: Handles separate file spaces and organisation for each user.
- Supports Multiple Text-Based File Types: Not limited to .txt files; supports PDFs, DOCX, and similar formats.
- **File Download:** Users can download any of their files by clicking on them in the explorer interface.

Example Screenshots
-------------------
Include up to 5 screenshots, labelled as:

1. Screenshot 1 – Homepage or dashboard view
2. Screenshot 2 – File upload interface
3. Screenshot 3 – Organised folder structure view
4. Screenshot 4 – Multi-user login or signup page

(Note: Placed actual screenshots in the screenshots folder. Also created README.md with AI assistance)