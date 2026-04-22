# Lovable Clone ([Link](https://lovable-clone-bu9m.onrender.com/))

## Architecture
<img width="2048" height="1116" alt="1aa13ff8-8eb6-4322-be41-1a45444023de" src="https://github.com/user-attachments/assets/518d483c-cad8-44ea-bd91-58e89ede6aa1" />


An AI-powered web application builder that allows users to create apps and websites by chatting with AI. This full-stack application combines a Next.js frontend with an Express.js backend to provide an interactive coding experience powered by AI.

## 🚀 Features

- **AI-Powered Project Generation**: Create web applications by describing what you want in natural language
- **Interactive Chat Interface**: Chat with AI to build and modify your projects
- **User Authentication**: Secure signup and signin with JWT-based authentication
- **Project Management**: Create, view, and manage multiple projects
- **Sandbox Environment**: Projects run in isolated E2B sandbox environments
- **Real-time Code Editing**: Monaco Editor integration for viewing and editing code
- **Cloud Storage**: Cloudflare R2 integration for file storage

## 🏗️ Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **Monaco Editor** - Code editor component
- **Lucide React** - Icons

### Backend
- **Express.js** - Web server framework
- **TypeScript** - Type safety
- **Prisma** - ORM for database management
- **PostgreSQL** - Database
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **E2B Code Interpreter** - Sandbox environment for code execution
- **Cloudflare R2** - Object storage
- **OpenRouter AI SDK** - AI model integration
- **Zod** - Schema validation

## 📁 Project Structure

```
lovable-clone/
├── backend/              # Express.js backend API
│   ├── src/
│   │   ├── controllers/  # Route controllers
│   │   ├── middleware/   # Auth middleware
│   │   ├── routes/       # API routes
│   │   ├── utils/        # Utility functions
│   │   ├── validations/  # Request validations
│   │   └── types/        # TypeScript types
│   ├── prisma/           # Prisma schema
│   └── tools/            # E2B tools
├── frontend/             # Next.js frontend
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API routes
│   │   ├── components/   # React components
│   │   ├── context/      # React context
│   │   └── projects/     # Project pages
│   └── public/           # Static assets
├── server.js             # Combined server (Express + Next.js)
└── package.json          # Root package configuration
```

## 🛠️ Prerequisites

- **Node.js** >= 18
- **PostgreSQL** database
- **Cloudflare R2** account (or AWS S3) for object storage
- **E2B API key** for sandbox environments
- **OpenRouter API key** (or compatible AI provider)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lovable-clone
   ```

2. **Install root dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

4. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

5. **Set up environment variables**

   Create a `.env` file in the `backend/` directory:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/lovable_clone"
   JWT_SECRET="your-secret-key"
   CLOUDFLARE_ACCOUNT_ID="your-account-id"
   CLOUDFLARE_ACCESS_KEY_ID="your-access-key"
   CLOUDFLARE_SECRET_ACCESS_KEY="your-secret-key"
   CLOUDFLARE_BUCKET="your-bucket-name"
   E2B_API_KEY="your-e2b-api-key"
   OPENROUTER_API_KEY="your-openrouter-api-key"
   PORT=3000
   NODE_ENV=development
   ```

   Create a `.env.local` file in the `frontend/` directory (if needed):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   ```

6. **Set up the database**
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate dev
   ```

## 🚀 Running the Application

### Development Mode

1. **Start the backend** (from `backend/` directory):
   ```bash
   npm run dev
   ```

2. **Start the frontend** (from `frontend/` directory):
   ```bash
   npm run dev
   ```

   The frontend will run on `http://localhost:3000` (or the port specified in your Next.js config).

### Production Mode

1. **Build the entire application**:
   ```bash
   npm run build
   ```

2. **Start the production server**:
   ```bash
   npm start
   ```

   The combined server will run on port 3000 (or the port specified in the `PORT` environment variable).

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login

### Projects
- `GET /api/projects` - Get all projects for authenticated user
- `POST /api/project` - Create a new project
- `GET /api/project/:projectId` - Get project details

### Prompt
- `POST /api/prompt` - Submit a prompt to generate/modify project code

## 🗄️ Database Schema

The application uses Prisma with PostgreSQL. Key models include:

- **User**: User accounts with authentication
- **Project**: User projects with sandbox information
- **Chat**: Chat sessions associated with projects
- **ChatConversation**: Individual messages in chats
- **AssistantResponse**: AI assistant responses

## 🔧 Development

### Backend Development
- Backend uses TypeScript with `ts-node-dev` for hot reloading
- Run `npm run dev` in the `backend/` directory for development
- Prisma migrations: `npx prisma migrate dev`

### Frontend Development
- Frontend uses Next.js with hot module replacement
- Run `npm run dev` in the `frontend/` directory for development
- The app uses the App Router (Next.js 13+)

## 📝 Scripts

### Root Level
- `npm run build` - Build both frontend and backend
- `npm start` - Start the production server

### Backend
- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript
- `npm start` - Start production server

### Frontend
- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🔒 Security

- Passwords are hashed using bcrypt
- JWT tokens are used for authentication
- CORS is configured for cross-origin requests
- Environment variables are used for sensitive configuration

## 📄 License

ISC

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on the repository.
