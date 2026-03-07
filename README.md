# Restaurant Voice AI Agent

An intelligent voice-powered ordering system for restaurants with AI-driven upselling, analytics, and real-time conversation handling.

## Overview

This project consists of a **Next.js frontend** and a **FastAPI backend** working together to provide:

- **AI Voice Ordering**: Natural language voice conversations for placing orders
- **Real-time Analytics**: Revenue insights, item profitability, and sales velocity
- **Conversation Management**: View and manage AI-customer conversations
- **Multi-language Support**: Hindi, English, and Hinglish support

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js       │────▶│   FastAPI        │────▶│   Supabase      │
│   Frontend      │◄────│   Backend        │◄────│   Database      │
│   (Port 3000)   │     │   (Port 8000)    │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │
         │              ┌────────┴────────┐
         │              │                 │
         ▼              ▼                 ▼
   ┌──────────┐   ┌──────────┐    ┌──────────┐
   │ OpenRouter│   │ Sarvam   │    │ Sarvam   │
   │ (LLM)    │   │ (STT)    │    │ (TTS)    │
   └──────────┘   └──────────┘    └──────────┘
```

### Tech Stack

**Frontend:**
- Next.js 16 with App Router
- TypeScript
- Tailwind CSS + shadcn/ui
- Recharts for analytics

**Backend:**
- FastAPI
- Python 3.12
- Supabase client
- Sarvam AI SDK

**AI/ML Services:**
- **OpenRouter** (`stepfun/step-3.5-flash:free`) - LLM for conversation & tool calling
- **Sarvam AI** - Speech-to-Text (STT) and Text-to-Speech (TTS)

**Database:**
- Supabase (PostgreSQL)
- Tables: `order`, `menu`, `restaurant`, `voice_orders`, `voice_order_items`

## Project Structure

```
hackathon2/
├── frontend/                 # Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/agent/   # AI agent API routes
│   │   │   ├── dashboard/   # Analytics dashboard
│   │   │   ├── voice-copilot/  # Voice session viewer
│   │   │   └── order/       # Order management
│   │   ├── components/ui/   # shadcn components
│   │   └── lib/
│   │       └── api.ts       # API client
│   └── .env                 # Environment variables
│
├── fastapi-endpoint/        # FastAPI backend
│   ├── main.py              # Main FastAPI app
│   ├── ai_agent.py          # AI agent logic
│   └── .env                 # Environment variables
│
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 18+ with bun or npm
- Python 3.12+ with uv
- Git

### 1. Clone the Repository

```bash
git clone <repository-url>
cd hackathon2
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
bun install
# or: npm install

# Create environment file
cp .env.example .env

# Edit .env with your API keys (see Environment Variables section)
```

### 3. Backend Setup

```bash
cd fastapi-endpoint

# Install dependencies with uv
uv sync

# Create environment file
cp .env.example .env

# Edit .env with your API keys (see Environment Variables section)
```

### 4. Environment Variables

Create `.env` files in both directories:

**frontend/.env:**
```bash
# Server-side secrets (used in Next.js API routes)
SARVAM_API_KEY=your_sarvam_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
SUPABASE_URL=https://maplbnfnthpjpfkbsgfs.supabase.co
SUPABASE_KEY=your_supabase_key

# Public env vars
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
```

**fastapi-endpoint/.env:**
```bash
SUPABASE_URL=https://maplbnfnthpjpfkbsgfs.supabase.co
SUPABASE_KEY=your_supabase_key
SARVAM_API_KEY=your_sarvam_api_key
```

**Required API Keys:**

1. **Sarvam AI** - Get from [dashboard.sarvam.ai](https://dashboard.sarvam.ai)
   - Used for STT (speech-to-text) and TTS (text-to-speech)

2. **OpenRouter** - Get from [openrouter.ai](https://openrouter.ai)
   - Used for LLM (stepfun/step-3.5-flash:free model)

3. **Supabase** - Get from [supabase.com](https://supabase.com)
   - Database URL and service role key

### 5. Database Setup

Ensure your Supabase project has these tables:
- `restaurant` - Restaurant information
- `menu` - Menu items with prices
- `order` - Order records
- `voice_orders` - AI voice order sessions
- `voice_order_items` - Items in voice orders

### 6. Running the Application

Open **two terminal windows**:

```bash
# Terminal 1 - Frontend (http://localhost:3000)
cd frontend
bun run dev

# Terminal 2 - FastAPI Backend (http://localhost:8000)
cd fastapi-endpoint
uvicorn main:app --reload
```

## Features

### 1. AI Voice Ordering

- **Natural Conversations**: Customers can speak naturally in Hindi/English
- **Tool Calling**: AI automatically calls tools to:
  - Fetch menu items
  - Add items to order
  - Modify quantities
  - Confirm orders
- **Real-time**: Streaming responses with voice output

### 2. Dashboard Analytics

- **KPI Cards**: Total revenue, orders, average order value
- **Charts**: Revenue by category (pie), top items (bar)
- **Insights**: Star items, under-promoted items, risk items

### 3. Voice Copilot

- **Session Viewer**: Browse all AI-customer conversations
- **Order Details**: View complete order information
- **Conversation Logs**: See full back-and-forth between AI and customer

### 4. Order Management

- Real-time order status
- Item modifications
- Payment tracking

## API Endpoints

### Frontend (Next.js API Routes)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agent/stream` | POST | Streaming AI conversation |
| `/api/agent/stt` | POST | Speech-to-text conversion |
| `/api/agent/tts` | POST | Text-to-speech conversion |
| `/api/agent` | DELETE | Delete session |

### Backend (FastAPI)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/{restaurant_id}` | GET | Revenue analytics |
| `/api/ai/voice-agent/sessions` | GET | Voice session list |
| `/api/ai/voice-agent/sessions/{id}` | GET | Session details |

## How It Works

### Voice Order Flow

1. **Customer speaks** → Audio captured in browser
2. **STT (Sarvam)** → Converts speech to text
3. **LLM (OpenRouter)** → Processes text, decides action
4. **Tool Execution** → Fetches menu/adds items/confirms order
5. **Response** → LLM generates natural response
6. **TTS (Sarvam)** → Converts text to Hindi speech
7. **Audio plays** → Customer hears response

### AI Tools

The LLM has access to these tools:

- `get_menu_items` - Fetch restaurant menu
- `add_item_to_order` - Add items to current order
- `get_order_summary` - Show current order details
- `modify_order_item` - Change item quantity/size
- `remove_item_from_order` - Remove items
- `confirm_order` - Finalize and save order
- `cancel_order` - Cancel current order

## Development

### Code Style

- **Frontend**: ESLint + Prettier configured
- **Backend**: Ruff for Python linting

### Key Files

- `frontend/src/app/api/agent/stream/route.ts` - Main AI streaming logic
- `frontend/src/app/api/agent/prompts.ts` - LLM system prompts
- `frontend/src/app/api/agent/tools.ts` - Tool implementations
- `fastapi-endpoint/main.py` - FastAPI routes

## Deployment

### Vercel (Frontend)

```bash
cd frontend
vercel --prod
```

Add environment variables in Vercel dashboard.

### Railway/Render (Backend)

```bash
cd fastapi-endpoint
# Deploy using Dockerfile or Procfile
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## License

MIT License - feel free to use for your restaurant projects!

## Support

For issues or questions:
- Open an issue on GitHub
- Contact: devagarwal@example.com

---

**Built with ❤️ for the Hackathon**
