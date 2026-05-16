```txt
We need a MAJOR Lead Intelligence system improvement pass across backend + frontend.

IMPORTANT:
DO NOT rewrite architecture.
DO NOT remove current MCP runtime.
DO NOT break socket.io realtime events.
DO NOT rebuild existing lead system.

Reuse:
- existing Prisma
- existing lead-mcp
- existing backend
- existing websocket events
- existing frontend routing
- existing LeadCard / LeadTable structure
- existing policy engine
- existing approvals system

==================================================
PROJECT CONTEXT
==================================================

Architecture:

LLM
↓
lead-mcp
↓
backend API
↓
scraper microservice (localhost:4001)
↓
PostgreSQL save
↓
socket.io emit
↓
frontend realtime update

Current apps:

apps/
  backend/
  frontend/
  filesystem-mcp/
  lead-mcp/

==================================================
CRITICAL ISSUE #1
analyze_website NOT USING MICROSERVICE CORRECTLY
==================================================

BIGGEST ISSUE RIGHT NOW:

The MCP tool analyze_website is NOT properly using the scraper microservice on localhost:4001.

The microservice already works in Postman.

THIS WORKS:
POST http://localhost:4001/api/public/scrape

BODY:
{
  "urls": ["https://aysh.me"]
}

The scraper microservice returns FULL structured lead data.

Example response:

{
  "success": true,
  "data": [
    {
      "url": "https://aysh.me/",
      "success": true,
      "data": {
        "website": "...",
        "logo": "...",
        "name": "...",
        "description": "...",
        "businessType": "...",
        "keywords": "...",
        "email": "...",
        "pages": {...},
        "socials": {...},
        "technologies": [...],
        "seo": {...},
        "performance": {...},
        "confidence": 80,
        "leadScore": 70,
        "priority": "HIGH"
      }
    }
  ]
}

==================================================
CURRENT PROBLEM
==================================================

Right now backend is doing:
fetch(url)

instead of:

fetch("http://localhost:4001/api/public/scrape")

This is WRONG.

==================================================
REQUIRED FIX
==================================================

Flow MUST become:

MCP tool
↓
backend endpoint
↓
backend calls localhost:4001/api/public/scrape
↓
extract full structured lead data
↓
save ALL structured data into PostgreSQL
↓
emit websocket realtime events
↓
return compact response to LLM

==================================================
IMPLEMENT THIS PROPERLY
==================================================

Create proper scraper service layer:

backend/src/leads/services/scraper.service.ts

This service should:

1. call localhost:4001/api/public/scrape
2. send:
{
  urls: [url]
}

3. validate response
4. normalize response
5. return structured lead object

==================================================
VERY IMPORTANT
==================================================

DO NOT scrape manually with fetch(url).

ONLY use the microservice.

==================================================
NEW FLOW
==================================================

analyze_website tool
↓
backend route
↓
scraper.service.ts
↓
localhost:4001/api/public/scrape
↓
response.data[0].data
↓
save to DB
↓
emit websocket events
↓
send compact summary to LLM

==================================================
BACKEND DB UPGRADE
==================================================

Current Lead schema is too small.

We need FULL enriched lead schema.

REPLACE current Lead model with upgraded production schema.

==================================================
NEW PRISMA LEAD MODEL
==================================================

model Lead {
  id             String        @id @default(cuid())

  website        String
  name           String?
  description    String?       @db.Text

  email          String?
  emailQuality   EmailQuality?

  phone          String?

  businessType   String?
  industry       String?

  leadScore      Int           @default(0)
  confidence     Int           @default(0)

  priority       LeadPriority?

  logo           String?
  screenshot     String?

  keywords       String?       @db.Text

  pages          Json?
  socials        Json?
  technologies   Json?
  seo            Json?
  performance    Json?

  rawData        Json?

  isEnriched     Boolean       @default(false)
  enrichedAt     DateTime?

  isFavorite     Boolean       @default(false)

  notes          String?       @db.Text

  tags           String[]

  exportedAt     DateTime?
  exportCount    Int           @default(0)

  status         LeadStatus    @default(TEMPORARY)

  pinned         Boolean       @default(false)

  expiresAt      DateTime?
  deletedAt      DateTime?

  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  @@index([status, expiresAt])
  @@index([deletedAt])
  @@index([createdAt])

  @@map("leads")
}

==================================================
ALSO CREATE ENUM
==================================================

enum EmailQuality {
  HIGH
  MEDIUM
  LOW
}

==================================================
SAVE FULL DATA
==================================================

When scraper response comes:

SAVE:
- description
- logo
- keywords
- socials
- pages
- seo
- performance
- technologies
- ALL structured data

NOT only:
- name
- score
- confidence

==================================================
FRONTEND UI IMPROVEMENTS
==================================================

CURRENT UI PROBLEM:
frontend/mcp/page.tsx feels:
- unstructured
- cramped
- disconnected
- debug-like

Need premium SaaS dashboard feel.

==================================================
TARGET DESIGN
==================================================

Style inspiration:
- Cursor
- Linear
- Raycast
- OpenAI dashboard
- Vercel

==================================================
LEADS TABLE IMPROVEMENTS
==================================================

Current LeadTable exists already.

DO NOT rewrite virtualization logic.

Improve:
- spacing
- hierarchy
- hover states
- typography
- visual grouping
- sticky table header
- selected row styling
- responsive layout

==================================================
IMPORTANT
==================================================

Current popup card opens bottom-right.

THIS FEELS BAD.

==================================================
NEW UX REQUIRED
==================================================

When clicking a lead row:

DO NOT open floating bottom-right popup.

Instead:
Open RIGHT SIDE SLIDE PANEL.

Like:
- Linear issue panel
- Notion side peek
- GitHub details panel

==================================================
NEW LAYOUT
==================================================

Left:
- leads table

Right:
- selected lead detail panel

Resizable optional.

==================================================
IMPLEMENT
==================================================

Replace current:

absolute right-6 bottom-6 popup

WITH:

fixed right side detail drawer/panel

==================================================
READ MORE FLOW
==================================================

Current small LeadCard should become:

Compact Preview Card

Then:
"View Full Lead"

opens:

/leads/[id]

==================================================
FULL LEAD PAGE
==================================================

The full lead page should show:

==================================================
SECTION 1 — HERO
==================================================

- logo
- company name
- website
- priority badge
- lead score
- confidence
- favorite button

==================================================
SECTION 2 — DESCRIPTION
==================================================

- full description
- keywords
- business type
- industry

==================================================
SECTION 3 — CONTACT
==================================================

- email
- phone
- socials
- github
- linkedin
- twitter
- youtube
- website links

==================================================
SECTION 4 — IMPORTANT PAGES
==================================================

Cards for:
- pricing
- docs
- careers
- contact
- blog

==================================================
SECTION 5 — TECHNOLOGIES
==================================================

Tech chips:
- React
- Next.js
- Vercel
- etc

==================================================
SECTION 6 — SEO
==================================================

Show:
- title
- meta description
- OG tags
- twitter card
- images
- links
- H1 count

==================================================
SECTION 7 — PERFORMANCE
==================================================

Show:
- jsHeap
- nodes
- documents

==================================================
SECTION 8 — RAW JSON
==================================================

Collapsible:
"View Raw Scrape Data"

==================================================
SOCKET.IO REALTIME EVENTS
==================================================

Current websocket logs are too raw.

Need premium AI execution UX.

==================================================
TARGET UX
==================================================

Inside assistant messages:

🧠 Thinking...
🛡 Checking policy...
⚡ Using analyze_website
🌐 Scraping website...
📊 Detecting technologies...
💾 Saving lead...
✅ Lead created

==================================================
IMPORTANT
==================================================

DO NOT show:
- raw socket events
- internal debug logs
- emit success
- raw timings

Convert into humanized AI execution states.

==================================================
IMPLEMENT
==================================================

Frontend execution timeline components:

components/chat/
  ExecutionTimeline.tsx
  ExecutionItem.tsx
  ToolChip.tsx
  ThinkingIndicator.tsx

==================================================
SOCKET EVENT MAPPING
==================================================

tool:start
→ Using analyze_website

policy:checking
→ Checking policy...

scrape:fetch
→ Fetching website...

scrape:technologies
→ Detecting technologies...

lead:created
→ Lead created successfully

==================================================
ANIMATIONS
==================================================

Add:
- fade in
- pulse
- shimmer
- streaming appearance

Minimal premium feel.

==================================================
TOKEN + COST TRACKING
==================================================

Need production-grade token analytics.

==================================================
BACKEND
==================================================

Create schema:

model ConversationUsage {
  id                String   @id @default(cuid())

  conversationId    String

  provider          String
  model             String

  inputTokens       Int      @default(0)
  outputTokens      Int      @default(0)
  totalTokens       Int      @default(0)

  inputCost         Float    @default(0)
  outputCost        Float    @default(0)
  totalCost         Float    @default(0)

  createdAt         DateTime @default(now())

  @@index([conversationId])
}

==================================================
IMPLEMENT TOKEN TRACKING
==================================================

Track:
- input tokens
- output tokens
- total tokens
- estimated cost

for every LLM request.

==================================================
SUPPORTED MODELS
==================================================

Need model pricing map:
- Groq
- OpenAI
- Claude

==================================================
FRONTEND TOKEN ANALYTICS
==================================================

Conversation UI should show:
- total tokens
- total cost
- model used
- tool count

==================================================
MCP PAGE UI IMPROVEMENTS
==================================================

Current MCP page feels broken.

Improve:
- card spacing
- server grouping
- typography
- hover states
- empty states
- status indicators
- responsive layout

==================================================
FINAL RESULT
==================================================

The app should feel like:
- modern AI operating system
- production AI agent dashboard
- premium SaaS
- intelligent realtime agent platform

NOT:
- debug dashboard
- engineering prototype
- raw admin panel

==================================================
IMPORTANT IMPLEMENTATION RULES
==================================================

DO NOT:
- rewrite architecture
- remove virtualization
- remove websocket system
- break MCP runtime
- break approvals
- break existing routes

ONLY:
- improve architecture quality
- improve scraper flow
- improve realtime UX
- improve lead storage
- improve lead viewing experience
- improve analytics
- improve dashboard quality
```
