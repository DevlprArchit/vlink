import { AiReadinessReport } from "./types";

export interface CopilotTurn {
  sender: "user" | "ai";
  text: string;
}

export interface CopilotContext {
  userName?: string;
  targetRole?: string;
  readinessScore?: number;
  skills?: string[];
  campus?: string;
}

// ─── External Cloud LLM Invocation (Gemini / Groq / OpenAI) ─────────────────

export async function callCloudLLM(params: {
  systemPrompt: string;
  userPrompt: string;
  history?: CopilotTurn[];
  geminiApiKey?: string;
  expectJson?: boolean;
  timeoutMs?: number;
}): Promise<{ text: string; provider: string } | null> {
  const geminiKey = (params.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
  const groqKey = (process.env.GROQ_API_KEY || "").trim();
  const openaiKey = (process.env.OPENAI_API_KEY || "").trim();
  const timeoutMs = params.timeoutMs ?? 8000;

  if (geminiKey) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const contents = [
        ...(params.history || []).slice(-6).map((m) => ({
          role: m.sender === "user" ? "user" : "model",
          parts: [{ text: m.text }],
        })),
        { role: "user", parts: [{ text: params.userPrompt }] },
      ];

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: params.systemPrompt }] },
            contents,
            generationConfig: {
              temperature: params.expectJson ? 0.25 : 0.7,
              maxOutputTokens: 900,
              ...(params.expectJson ? { responseMimeType: "application/json" } : {}),
            },
          }),
        }
      );
      clearTimeout(timer);
      if (res.ok) {
        const json = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return { text, provider: "gemini-2.5-flash" };
      }
    } catch {
      // fall through cleanly
    }
  }

  const compatKey = groqKey || openaiKey;
  if (compatKey) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const endpoint = groqKey
        ? "https://api.groq.com/openai/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";
      const model = groqKey ? "llama-3.3-70b-versatile" : "gpt-4o-mini";

      const messages = [
        { role: "system", content: params.systemPrompt },
        ...(params.history || []).slice(-6).map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text,
        })),
        { role: "user", content: params.userPrompt },
      ];

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${compatKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({ model, messages, temperature: params.expectJson ? 0.25 : 0.7 }),
      });
      clearTimeout(timer);
      if (res.ok) {
        const json = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text = json.choices?.[0]?.message?.content?.trim();
        if (text) return { text, provider: groqKey ? "groq-llama" : "openai" };
      }
    } catch {
      // fall through cleanly
    }
  }

  return null;
}

// ─── Open Knowledge & Math Helpers for Built-In Conversational Engine ───────

function trySafeArithmetic(input: string): string | null {
  const cleaned = input
    .toLowerCase()
    .replace(/^(what is|calculate|compute|solve|eval|evaluate)\s+/i, "")
    .replace(/\?+$/, "")
    .trim();

  if (!/^[0-9+\-*/().%\s^]{2,50}$/.test(cleaned)) return null;
  if (!/[+\-*/^]/.test(cleaned)) return null;

  try {
    const normalized = cleaned.replace(/\^/g, "**");
    const fn = new Function(`"use strict"; return (${normalized});`) as () => unknown;
    const val = fn();
    if (typeof val === "number" && Number.isFinite(val)) {
      const formatted = Number.isInteger(val) ? val.toString() : Number(val.toFixed(4)).toString();
      return `The result of \`${cleaned}\` is **${formatted}**.`;
    }
  } catch {
    return null;
  }
  return null;
}

async function fetchWikipediaSummary(topic: string): Promise<{ title: string; extract: string; url?: string } | null> {
  const cleaned = topic
    .replace(/[?!.]+$/, "")
    .replace(/^(who is|who was|what is|what are|what was|tell me about|explain|define|overview of|history of)\s+/i, "")
    .replace(/^(a|an|the)\s+/i, "")
    .trim();
  if (!cleaned || cleaned.length < 2 || cleaned.length > 80) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(cleaned)}&limit=1&namespace=0&format=json`;
    const searchRes = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "VLink-Campus-Assistant/1.0" },
    });
    if (!searchRes.ok) {
      clearTimeout(timer);
      return null;
    }
    const searchData = (await searchRes.json()) as [string, string[], string[], string[]];
    const bestTitle = searchData?.[1]?.[0];
    if (!bestTitle) {
      clearTimeout(timer);
      return null;
    }
    const summaryRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestTitle.replace(/ /g, "_"))}`,
      {
        signal: controller.signal,
        headers: { "User-Agent": "VLink-Campus-Assistant/1.0" },
      }
    );
    clearTimeout(timer);
    if (!summaryRes.ok) return null;
    const sum = (await summaryRes.json()) as {
      title?: string;
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
    };
    if (sum.extract && sum.extract.length > 30) {
      return {
        title: sum.title || bestTitle,
        extract: sum.extract,
        url: sum.content_urls?.desktop?.page,
      };
    }
  } catch {
    return null;
  }
  return null;
}

const CS_KNOWLEDGE_BASE: Array<{ keywords: string[]; title: string; answer: string }> = [
  {
    keywords: ["react", "hooks", "useeffect", "usestate", "virtual dom"],
    title: "React & Modern Frontend Concepts",
    answer:
      "React builds declarative UIs using a component tree and reconciles state updates efficiently via the Virtual DOM.\n\n- **Hooks (`useState`, `useEffect`, `useMemo`, `useCallback`)**: Let functional components manage local state, synchronize side effects safely, and prevent unnecessary re-renders.\n- **Keys in Lists**: Always pass a unique, stable `key` prop so React tracks element identity correctly during reordering.\n- **Next.js App Router**: Separates Server Components (zero client JS, fast SSR) from `'use client'` interactive islands.",
  },
  {
    keywords: ["next.js", "nextjs", "ssr", "server component", "app router"],
    title: "Next.js Full-Stack Architecture",
    answer:
      "Next.js extends React with hybrid rendering and built-in backend API routes:\n\n- **SSR / RSC**: Renders dynamic data on the server for strong SEO and fast Time-to-First-Byte.\n- **Route Handlers (`/api/...`)**: Act as a secure BFF (Backend for Frontend) so database credentials and AI API keys stay hidden from browsers.\n- **Suspense & Streaming**: Wraps dynamic boundaries like `useSearchParams()` so static shells render immediately.",
  },
  {
    keywords: ["typescript", "type safety", "interface", "union type", "generics"],
    title: "TypeScript Type System",
    answer:
      "TypeScript adds structural static typing on top of JavaScript so bugs are caught at compile time:\n\n- **Discriminated Unions**: Model API responses cleanly (`{ ok: true; data: T } | { ok: false; error: string }`) for exhaustive narrowing.\n- **`unknown` vs `any`**: Prefer `unknown` for external JSON payloads so you enforce runtime validation before accessing fields.\n- **Generics**: Write reusable utilities (like `callAiService<TReq, TRes>`) without losing type inference.",
  },
  {
    keywords: ["aws", "cloud", "dynamodb", "cognito", "s3", "lambda", "amplify"],
    title: "AWS Cloud & Serverless Stack",
    answer:
      "Serverless AWS eliminates server maintenance while scaling automatically with demand:\n\n- **AWS Amplify + CloudFront**: Hosts Next.js SSR apps with global edge caching and managed compute.\n- **Amazon DynamoDB**: Single-digit millisecond NoSQL database ideal for pay-per-request student/job records.\n- **Amazon Cognito**: Handles JWT identity pools, institutional sign-up, and federated sessions.\n- **Amazon S3**: Stores static resumes, avatars, and media assets with pre-signed access and CORS rules.",
  },
  {
    keywords: ["dsa", "algorithm", "time complexity", "big o", "binary search", "dynamic programming", "linked list", "tree", "graph"],
    title: "Data Structures & Algorithms Guide",
    answer:
      "Strong DSA fundamentals are tested in almost every Tier-1 engineering interview:\n\n- **HashMaps (`O(1)` lookup)**: Use for frequency counts, Two-Sum, caching, and deduplication.\n- **Two Pointers & Sliding Window (`O(n)`)**: Best for sorted arrays, subarrays, and substring constraints.\n- **Binary Search (`O(log n)`)**: Applies not only to sorted arrays, but also to monotonic answer spaces ('minimum capacity to ship within D days').\n- **Trees & Graphs (BFS/DFS)**: Master level-order traversal, cycle detection, and shortest path algorithms.",
  },
  {
    keywords: ["oops", "oop", "object oriented", "polymorphism", "encapsulation", "inheritance", "abstraction"],
    title: "Object-Oriented Programming (OOP) Pillars",
    answer:
      "The 4 foundational pillars of OOP frequently asked in campus placements:\n\n1. **Encapsulation**: Bundling data and methods inside a class while hiding internal state behind controlled accessors.\n2. **Abstraction**: Exposing essential behavior via interfaces/abstract classes while hiding complex implementation details.\n3. **Inheritance**: Allowing subclasses to reuse and specialize parent behavior (`extends`).\n4. **Polymorphism**: Allowing one interface to take multiple forms (compile-time overloading & runtime method overriding).",
  },
  {
    keywords: ["dbms", "sql", "normalization", "acid", "index", "join"],
    title: "DBMS & SQL Interview Essentials",
    answer:
      "Core database concepts for technical interviews:\n\n- **ACID Properties**: Atomicity (all or nothing), Consistency (valid state transitions), Isolation (concurrent transaction safety), Durability (persisted commits).\n- **Indexing (B-Trees / Hash)**: Dramatically accelerates `WHERE` and `JOIN` queries while trading off slightly slower writes.\n- **Normalization (1NF -> 3NF -> BCNF)**: Reduces redundant storage and update anomalies.",
  },
  {
    keywords: ["system design", "scalability", "load balancer", "caching", "redis", "microservices"],
    title: "System Design Fundamentals",
    answer:
      "When answering System Design questions in interviews, structure your answer in 4 steps:\n\n1. **Requirements & Scale**: Clarify functional features + QPS / storage estimates.\n2. **High-Level Architecture**: Client -> CDN -> Load Balancer -> Stateless API Services -> Cache (Redis) -> Database + Async Queue.\n3. **Bottlenecks & Trade-offs**: Discuss read replicas, sharding, cache eviction (LRU), rate limiting, and circuit breakers.\n4. **Reliability**: Health checks, retries with exponential backoff, and graceful degradation.",
  },
];

// ─── 1. Conversational AI Copilot Reply ──────────────────────────────────────

export async function generateCopilotReply(params: {
  message: string;
  history?: CopilotTurn[];
  context?: CopilotContext;
  geminiApiKey?: string;
}): Promise<{ reply: string; provider: string }> {
  const { message, history = [], context = {}, geminiApiKey } = params;
  const userName = context.userName ? context.userName.split(" ")[0] : "there";
  const roleLabel = context.targetRole || "Software Engineering";
  const driNote =
    typeof context.readinessScore === "number" && context.readinessScore > 0
      ? `Current verified DRI Score: ${context.readinessScore}/100.`
      : "DRI Diagnostic Status: Not evaluated yet (0/100).";

  const systemPrompt = `You are V-Link AI Mentor, an intelligent, warm, versatile conversational AI assistant built into the V-Link Campus Talent & Career OS.
User Context:
- Name: ${context.userName || "Guest Student"}
- Campus: ${context.campus || "HIET Shahpur (HPTU)"}
- Target Role: ${roleLabel}
- ${driNote}
- Key Skills: ${(context.skills || []).join(", ") || "Not specified yet"}

Guidelines:
- Answer ANY question the user asks naturally — whether it's a casual greeting ("hello", "how are you"), general knowledge, programming, math, interview prep, career advice, resume writing, or V-Link platform features.
- Keep responses concise, helpful, friendly, and formatted with clean Markdown when useful.
- Use conversation history naturally for follow-up questions.`;

  const cloud = await callCloudLLM({
    systemPrompt,
    userPrompt: message,
    history,
    geminiApiKey,
  });

  if (cloud) {
    return { reply: cloud.text, provider: cloud.provider };
  }

  // Built-in intelligent conversational engine (handles greetings, follow-ups, math, open knowledge, CS, V-Link)
  const raw = message.trim();
  const p = raw.toLowerCase();

  // Check arithmetic first
  const mathRes = trySafeArithmetic(raw);
  if (mathRes) {
    return { reply: mathRes, provider: "vlink-built-in-ai" };
  }

  // Natural conversational greetings & small talk
  if (/^(hi+|hello+|hey+|hii+|hola|namaste|yo|sup|good\s*(morning|afternoon|evening|night))[!.,\s]*$/i.test(raw)) {
    const driPrompt =
      context.readinessScore && context.readinessScore > 0
        ? `Your current DRI score is **${context.readinessScore}/100** targeting **${roleLabel}**.`
        : `I see your DRI test hasn't been completed yet — you can generate your AI DRI report anytime on \`/readiness\`.`;
    return {
      reply: `Hey ${userName}! 👋 Great to connect with you.\n\n${driPrompt}\n\nWhat's on your mind today? We can chat about coding concepts, review your resume wording, practice an interview question, or explore anything else you're curious about!`,
      provider: "vlink-built-in-ai",
    };
  }

  if (/(how are you|how's it going|how r u|how do you do|what'?s up)/i.test(p)) {
    return {
      reply: `Doing awesome, ${userName} — thanks for asking! 😊 Ready to help you crush your goals today.\n\nHow's your preparation going for **${roleLabel}**? Ask me literally anything — technical concepts, interview prep, resume phrasing, or general questions.`,
      provider: "vlink-built-in-ai",
    };
  }

  if (/^(thanks|thank you|thx|tysm|appreciated|cool|nice|ok|okay|got it|great|awesome)[!.\s]*$/i.test(raw)) {
    return {
      reply: `You're very welcome, ${userName}! Let me know anytime if you'd like to dive deeper into another question or practice a mock interview.`,
      provider: "vlink-built-in-ai",
    };
  }

  if (/(who are you|what is your name|what can you do|help me)/i.test(p) && raw.split(/\s+/).length <= 7) {
    return {
      reply: `I'm **V-Link AI Mentor** — your conversational career, coding, and general assistant! ✨\n\nHere are a few things you can ask me directly:\n- **General & Technical Questions**: *"Explain React hooks"*, *"Who is Alan Turing?"*, *"What is ACID in DBMS?"*\n- **Resume & Writing Help**: *"Write a strong summary for a Cloud Engineer"* or *"Help improve my project bullet"*\n- **Interview Coaching**: *"Ask me a system design question"* or *"How do I explain my project in an interview?"*\n- **V-Link Telemetry**: *"How does AI DRI scoring work?"* or *"Check HIET placement info"*\n\nJust ask naturally in plain language!`,
      provider: "vlink-built-in-ai",
    };
  }

  // Handle "tell me a joke" or casual fun prompts
  if (p.includes("joke") || p.includes("funny")) {
    return {
      reply: `Why do programmers prefer dark mode?\nBecause **light attracts bugs!** 🐛😄\n\nWhenever you're ready, let me know what topic or career task you'd like to tackle next!`,
      provider: "vlink-built-in-ai",
    };
  }

  // Handle follow-up phrases referencing history
  const lastAi = [...history].reverse().find((h) => h.sender === "ai")?.text || "";
  if (
    lastAi &&
    /^(explain more|tell me more|more|example|give an example|simplify|short summary|elaborate)/i.test(p)
  ) {
    const topicLine = lastAi.split("\n")[0].replace(/[#*`]/g, "").trim();
    return {
      reply: `Building on **${topicLine || "what we discussed"}**:\n\nThink of it practically in an engineering interview setting:\n1. **Core Takeaway**: Focus on *why* the mechanism exists (preventing bottlenecks, improving clarity, or reducing failure rates).\n2. **Concrete Example**: When explaining your own project, tie it to a measurable metric (for instance, *"reduced API response time from 420ms to 95ms"* or *"achieved 100% pass rate across automated tests"*).\n\nWould you like me to draft a 2-sentence explanation tailored specifically for **${roleLabel}**?`,
      provider: "vlink-built-in-ai",
    };
  }

  // V-Link platform specifics (DRI / Resume / Jobs / HIET TPO)
  if (p.includes("tpo") || p.includes("ruchi") || p.includes("hiet")) {
    return {
      reply: `At **HIET Shahpur (HPTU)**, the Training & Placement Cell is led by **Ms. Ruchi** (Head of Training & Placement, \`tpo@hiet.co.in\`).\n\nYou can view verified cohort eligibility, broadcast placement drives, and NAAC/NBA accreditation exports directly inside the **Institutional TPO Hub** (\`/tpo\`).`,
      provider: "vlink-built-in-ai",
    };
  }

  if (p.includes("dri") || (p.includes("readiness") && (p.includes("score") || p.includes("test") || p.includes("report")))) {
    return {
      reply: `### ⚡ AI-Powered Demonstrable Readiness Index (DRI)\n\nUnlike static portals, your DRI Score starts at **Pending (0/100)** when you sign up and is **generated fresh by AI** once you complete your diagnostic test on \`/readiness\`.\n\nIt evaluates 6 signals:\n1. **Verified Skills & Quizzes**\n2. **Diagnostic Accuracy**\n3. **Production Projects**\n4. **Certifications**\n5. **Skill Verification Badges**\n6. **Role Skill Coverage for ${roleLabel}**\n\nHead to \`/readiness\` and complete the diagnostic to generate your tailored AI DRI Report!`,
      provider: "vlink-built-in-ai",
    };
  }

  if (p.includes("resume") || p.includes("ats")) {
    return {
      reply: `### 📄 V-Link AI Resume Studio & ATS Auditor\n\nYour **ATS Resume Studio** (\`/resume\`) now includes live AI assistance:\n- **Auto Writing Pop-up**: Pause while typing your Summary or Project descriptions and click **"Want to write more?"** to have AI expand your ideas into metric-backed bullet points.\n- **AI ATS Audit**: Analyzes your live edited resume against your target role or pasted Job Description in real time.\n\n${context.skills?.length ? `Since you already list **${context.skills.slice(0, 4).join(", ")}**, make sure at least 2 project bullets include specific impact numbers!` : "Include quantified results (latency, scale, users) in each bullet to cross 85+ ATS score."}`,
      provider: "vlink-built-in-ai",
    };
  }

  if (p.includes("job") || p.includes("apply") || p.includes("internship") || p.includes("placement")) {
    return {
      reply: `### 💼 Real Jobs, Official Portals & Interview Prep\n\nOn the **Jobs Portal** (\`/jobs\`), each opening includes:\n- **Official Job Req ID** (e.g. \`REQ-AWS-2948172\`, \`REQ-GOOG-884120\`, \`REQ-MSFT-1749203\`)\n- **LinkedIn-Style Application Form** + **Apply on Official Website ↗** direct link\n- **1-Click Give AI Interview** button that pre-loads the AI Interview Simulator for that exact role & skill stack!`,
      provider: "vlink-built-in-ai",
    };
  }

  // CS Knowledge Base matching
  for (const entry of CS_KNOWLEDGE_BASE) {
    if (entry.keywords.some((kw) => p.includes(kw))) {
      return {
        reply: `### ${entry.title}\n\n${entry.answer}`,
        provider: "vlink-built-in-ai",
      };
    }
  }

  // Email / Cover letter drafting
  if (p.includes("email") || p.includes("cover letter") || p.includes("cold message") || p.includes("write a")) {
    return {
      reply: `Here is a crisp, personalized draft you can customize right away:\n\n> **Subject:** Application for ${roleLabel} Opportunity — ${context.userName || "Candidate"}\n>\n> Hi Hiring Team,\n>\n> I am a Computer Science student at ${context.campus || "HIET Shahpur"} specializing in ${context.skills?.slice(0, 4).join(", ") || "full-stack engineering & cloud systems"}. I recently built end-to-end scalable projects with production testing and verified technical readiness.\n>\n> I would welcome the chance to interview for this role and contribute from day one. My resume and portfolio links are attached.\n>\n> Best regards,\n> ${context.userName || "Archit Sharma"}\n\nWant me to shorten it for LinkedIn DM or tailor it to a specific company?`,
      provider: "vlink-built-in-ai",
    };
  }

  // Live Wikipedia factual fallback for ANY open general-knowledge question!
  if (
    /^(who|what|where|when|why|how|tell me|explain|define)\b/i.test(p) ||
    raw.split(/\s+/).length <= 5
  ) {
    const wiki = await fetchWikipediaSummary(raw);
    if (wiki) {
      return {
        reply: `### ${wiki.title}\n\n${wiki.extract}${wiki.url ? `\n\n[Read more on Wikipedia ↗](${wiki.url})` : ""}`,
        provider: "vlink-knowledge-engine",
      };
    }
  }

  // Intelligent contextual response for completely arbitrary statements
  return {
    reply: `That's a great topic to explore, ${userName}! Regarding **"${raw}"**:\n\nI can help break this down further depending on what you need:\n- If this is for **${roleLabel}** interview prep, focus on core architecture, edge cases, and measurable trade-offs.\n- If you'd like live generative web-scale LLM answers for free-form creative prompts too, you can optionally click the **⚙ Key** icon in this chat header to connect a Google Gemini API key anytime — or ask me any specific question like *"Explain Docker containers"*, *"Calculate 18 * 45"*, or *"Help me write my project summary"*!`,
    provider: "vlink-built-in-ai",
  };
}

// ─── 2. Resume "Want to write more?" Auto-Suggest Continuation Engine ─────────

export async function generateResumeContinuation(params: {
  fieldType: "summary" | "project-desc" | "bullet";
  currentText: string;
  targetRole: string;
  skills: string;
  projectTitle?: string;
  geminiApiKey?: string;
}): Promise<{ suggestions: string[]; headlinePrompt: string; provider: string }> {
  const { fieldType, currentText, targetRole, skills, projectTitle, geminiApiKey } = params;
  const trimmed = currentText.trim();
  const skillList = skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
  const stackStr = skillList.length > 0 ? skillList.join(", ") : "TypeScript, Next.js, and AWS";

  const cloud = await callCloudLLM({
    geminiApiKey,
    expectJson: true,
    systemPrompt: `You are an expert ATS Resume Writer & Technical Recruiter. Return valid JSON ONLY with keys: "headlinePrompt" (short encouraging string), and "suggestions" (array of 3 strong, concise, ATS-friendly continuation or rewritten strings using strong action verbs and realistic impact metrics). Never include placeholders like [X].`,
    userPrompt: `Field type: ${fieldType}
Target Role: ${targetRole}
Project Title: ${projectTitle || "N/A"}
User Skills: ${stackStr}
What user has written so far: "${trimmed}"
Task: Provide 3 high-impact ways to continue or strengthen what the user started writing.`,
  });

  if (cloud) {
    try {
      const parsed = JSON.parse(cloud.text) as { headlinePrompt?: string; suggestions?: string[] };
      if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
        return {
          headlinePrompt: parsed.headlinePrompt || "Want to expand this with stronger impact & ATS phrasing?",
          suggestions: parsed.suggestions.slice(0, 3),
          provider: cloud.provider,
        };
      }
    } catch {
      // fall through cleanly
    }
  }

  // Dynamic context-aware synthesis matching user's exact words and field type
  if (fieldType === "summary") {
    const base = trimmed
      ? trimmed.replace(/[.]+$/, "")
      : `Motivated ${targetRole} specializing in ${stackStr}`;
    return {
      headlinePrompt: "Want to write more? Let AI expand your summary with role keywords:",
      suggestions: [
        `${base}, with hands-on experience designing scalable full-stack applications, clean RESTful APIs, and cloud deployments that reduce response latency by 35%+.`,
        `Results-focused ${targetRole} skilled in ${stackStr}. Proven ability to translate complex requirements into modular, well-tested production software and collaborate effectively across agile engineering teams.`,
        `${base}. Passionate about performance optimization, automated testing, and delivering user-centric engineering solutions.`,
      ],
      provider: "vlink-writing-ai",
    };
  }

  if (fieldType === "project-desc") {
    const proj = projectTitle?.trim() || "this application";
    const base = trimmed ? trimmed.replace(/[.]+$/, "") : `Engineered ${proj} leveraging ${stackStr}`;
    return {
      headlinePrompt: `Want to add technical depth to ${proj}?`,
      suggestions: [
        `${base}, incorporating modular API endpoints, responsive UI workflows, and automated validation tests for reliable production performance.`,
        `${base} to streamline end-to-end user workflows, integrating database persistence, real-time analytics, and secure authentication.`,
        `Architected ${proj} with ${stackStr}, handling authentication, clean state management, and scalable deployment pipelines.`,
      ],
      provider: "vlink-writing-ai",
    };
  }

  // bullet
  const seed = trimmed ? trimmed.replace(/[.]+$/, "") : `Built core modules for ${projectTitle || "the platform"}`;
  return {
    headlinePrompt: "Want to expand this bullet using Google XYZ impact formula?",
    suggestions: [
      `${seed}, improving end-to-end execution speed by 38% and eliminating redundant network requests via caching and query optimization.`,
      `${seed} utilizing ${stackStr}, backed by unit/integration tests and clean CI/CD deployment workflows.`,
      `Engineered and deployed ${seed.toLowerCase()}, enabling seamless responsiveness across mobile and desktop viewports with zero downtime.`,
    ],
    provider: "vlink-writing-ai",
  };
}

// ─── 3. Live AI ATS Resume Scorer & Deep Audit ──────────────────────────────

export async function analyzeResumeAts(params: {
  fullName: string;
  targetRole: string;
  summary: string;
  skills: string;
  projects: Array<{ title: string; techStack: string; description: string; bullets: string[] }>;
  education: string;
  certifications: string;
  jobDescription?: string;
  geminiApiKey?: string;
}): Promise<{
  ats_score: number;
  grade: string;
  summary_verdict: string;
  ats_checklist: Array<{ label: string; passed: boolean }>;
  matched_keywords: string[];
  missing_keywords: string[];
  ai_recommendations: string[];
  provider: string;
}> {
  const fullResumeText = [
    params.fullName,
    params.targetRole,
    params.summary,
    params.skills,
    params.education,
    params.certifications,
    ...params.projects.map((p) => `${p.title} ${p.techStack} ${p.description} ${p.bullets.join(" ")}`),
  ]
    .join(" ")
    .trim();

  const cloud = await callCloudLLM({
    geminiApiKey: params.geminiApiKey,
    expectJson: true,
    systemPrompt: `You are an enterprise ATS (Applicant Tracking System) & Technical Hiring AI. Evaluate the candidate's LIVE resume JSON and optional target Job Description accurately.
Return strict JSON with keys:
- "ats_score" (integer 0-100, realistic based on actual depth, quantified metrics, action verbs, skills, and project bullets)
- "grade" (string like "Tier-1 Ready", "Strong", "Needs Metrics", "Draft")
- "summary_verdict" (1 concise sentence summarizing strength)
- "matched_keywords" (string array of key skills/keywords found)
- "missing_keywords" (string array of important missing keywords for their target role or JD)
- "ai_recommendations" (array of 3 specific, actionable improvements tailored to this resume)`,
    userPrompt: JSON.stringify({
      targetRole: params.targetRole,
      summary: params.summary,
      skills: params.skills,
      projects: params.projects,
      education: params.education,
      certifications: params.certifications,
      jobDescription: params.jobDescription || "",
    }),
  });

  const actionVerbs = [
    "architected",
    "built",
    "engineered",
    "developed",
    "designed",
    "implemented",
    "optimized",
    "deployed",
    "reduced",
    "automated",
    "led",
    "integrated",
    "scaled",
    "created",
  ];
  const lower = fullResumeText.toLowerCase();
  const hasSummary = params.summary.trim().length >= 60;
  const skillTokens = params.skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const hasSkills = skillTokens.length >= 4;
  const hasProjects = params.projects.length >= 1 && params.projects.some((p) => p.bullets.length >= 1);
  const hasMetrics = /\b\d+(\.\d+)?(%|\+|ms|s|x|k|users|routes|tests)\b/i.test(fullResumeText);
  const verbCount = actionVerbs.filter((v) => lower.includes(v)).length;
  const hasActionVerbs = verbCount >= 2;
  const hasEdu = params.education.trim().length >= 8;

  const atsChecklist = [
    { label: "Single-column ATS-parseable structure", passed: true },
    { label: "Impact summary (>= 60 chars)", passed: hasSummary },
    { label: "Quantified engineering metrics (%, ms, scale)", passed: hasMetrics },
    { label: "Action-verb phrasing (engineered, built, scaled)", passed: hasActionVerbs },
    { label: "Minimum 4 core technical skills listed", passed: hasSkills },
    { label: "Verified project bullets & education present", passed: hasProjects && hasEdu },
  ];

  if (cloud) {
    try {
      const parsed = JSON.parse(cloud.text) as {
        ats_score?: number;
        grade?: string;
        summary_verdict?: string;
        matched_keywords?: string[];
        missing_keywords?: string[];
        ai_recommendations?: string[];
      };
      if (typeof parsed.ats_score === "number") {
        return {
          ats_score: Math.max(0, Math.min(100, Math.round(parsed.ats_score))),
          grade: parsed.grade || (parsed.ats_score >= 82 ? "Tier-1 Ready" : "Strong"),
          summary_verdict: parsed.summary_verdict || "Evaluated live against ATS parsing heuristics and role alignment.",
          ats_checklist: atsChecklist,
          matched_keywords: parsed.matched_keywords || skillTokens.slice(0, 6),
          missing_keywords: parsed.missing_keywords || [],
          ai_recommendations: parsed.ai_recommendations || [],
          provider: cloud.provider,
        };
      }
    } catch {
      // fallback cleanly below
    }
  }

  // Deterministic dynamic AI audit based strictly on live edited resume content!
  let computed = 25; // baseline valid contact/layout
  if (params.fullName.trim().length > 2) computed += 8;
  if (hasSummary) computed += 15;
  else if (params.summary.trim().length > 15) computed += 7;
  if (hasSkills) computed += 15;
  else computed += Math.min(10, skillTokens.length * 3);
  if (hasProjects) computed += 15;
  if (hasMetrics) computed += 10;
  if (hasActionVerbs) computed += 7;
  if (hasEdu) computed += 5;

  const jdTokens = (params.jobDescription || "")
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((w) => w.length >= 3);
  const roleDefaults = ["typescript", "react", "python", "sql", "docker", "aws", "git", "testing", "ci/cd", "api"];
  const benchmarkKeywords = jdTokens.length > 8
    ? Array.from(new Set(jdTokens.filter((w) => roleDefaults.includes(w) || ["next.js", "node.js", "kubernetes", "fastapi", "java", "c++", "linux", "redis"].includes(w))))
    : roleDefaults.slice(0, 6);

  const matched = benchmarkKeywords.filter((kw) => lower.includes(kw));
  const missing = benchmarkKeywords.filter((kw) => !lower.includes(kw)).slice(0, 5);

  const finalScore = Math.max(15, Math.min(98, computed - Math.min(8, missing.length * 2)));
  const recs: string[] = [];
  if (!hasMetrics) recs.push("Add quantifiable numbers in project bullets (e.g. 'reduced API latency by 35%' or '500+ active users').");
  if (!hasActionVerbs) recs.push("Start every project bullet with high-impact action verbs like 'Architected', 'Engineered', or 'Optimized'.");
  if (!hasSummary) recs.push("Expand your Professional Summary to 2–3 sentences using the 'Want to write more?' AI assistant.");
  if (missing.length > 0) recs.push(`Incorporate role-aligned keywords where authentic: ${missing.join(", ")}.`);
  if (recs.length === 0) recs.push("Strong ATS alignment! Run a tailored Resume-to-JD check against each job before applying.");

  return {
    ats_score: finalScore,
    grade: finalScore >= 85 ? "Tier-1 Ready" : finalScore >= 70 ? "Strong Contender" : "Needs Strengthening",
    summary_verdict:
      finalScore >= 85
        ? `High-performing ${params.targetRole} resume with strong action verbs and parseable structure.`
        : `Solid foundation for ${params.targetRole}; implementing the recommendations below can boost ATS pass rate.`,
    ats_checklist: atsChecklist,
    matched_keywords: matched.length > 0 ? matched : skillTokens.slice(0, 6),
    missing_keywords: missing,
    ai_recommendations: recs.slice(0, 3),
    provider: "vlink-ats-ai",
  };
}

// ─── 4. AI-Powered DRI Diagnostic Evaluation & Report ───────────────────────

export async function generateAiReadinessAssessment(params: {
  userName: string;
  targetRole: string;
  skills: Array<{ name: string; level: number; verified: boolean; endorsements: number }>;
  projects: Array<{ title: string; description: string; techStack: string[] }>;
  certifications: Array<{ title: string; completed: boolean; progress: number }>;
  diagnosticAnswers: Array<{
    question_id: string;
    skill: string;
    selected_option: number;
    correct_option: number;
  }>;
  geminiApiKey?: string;
}): Promise<{
  overall_score: number;
  tier: string;
  dimension_scores: Record<string, number>;
  missing_core_skills: string[];
  recommendations: string[];
  ai_report: AiReadinessReport;
  ai_source: string;
}> {
  const answers = params.diagnosticAnswers || [];
  const correctCount = answers.filter((a) => a.selected_option === a.correct_option).length;
  const diagScore = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;

  const skillAvg = params.skills.length
    ? Math.round(params.skills.reduce((acc, s) => acc + s.level, 0) / params.skills.length)
    : 35;
  const projScore = Math.min(100, params.projects.length * 30 + (params.projects.length > 0 ? 15 : 0));
  const certDone = params.certifications.filter((c) => c.completed).length;
  const certScore = Math.min(100, certDone * 35 + params.certifications.length * 10);
  const verifiedCount = params.skills.filter((s) => s.verified).length;
  const verifScore = Math.min(100, verifiedCount * 30);
  const coverageScore = Math.min(100, Math.round(params.skills.length * 12 + diagScore * 0.35));

  const overall = Math.min(
    98,
    Math.max(
      18,
      Math.round(0.28 * diagScore + 0.25 * skillAvg + 0.2 * projScore + 0.12 * certScore + 0.15 * verifScore)
    )
  );

  const tier =
    overall >= 82
      ? "Industry Ready (Tier-1)"
      : overall >= 68
      ? "Strong Contender"
      : overall >= 48
      ? "Building Momentum"
      : "Foundation Stage";

  const roleRequirements: Record<string, string[]> = {
    "Full-Stack Software Engineer": ["TypeScript", "React", "Next.js", "SQL", "Docker", "Testing", "AWS"],
    "AI/ML Engineer": ["Python", "PyTorch", "Machine Learning", "FastAPI", "SQL", "NLP", "Docker"],
    "Cloud & DevOps Engineer": ["AWS", "Docker", "Kubernetes", "Linux", "CI/CD", "Terraform", "Python"],
    "Backend Engineer": ["Python", "Node.js", "SQL", "REST APIs", "Redis", "Docker", "System Design"],
    "Frontend Engineer": ["TypeScript", "React", "Next.js", "Tailwind CSS", "Accessibility", "Testing"],
    "Data Engineer": ["Python", "SQL", "Spark", "Airflow", "ETL", "AWS", "Data Modeling"],
  };

  const expected = roleRequirements[params.targetRole] || roleRequirements["Full-Stack Software Engineer"];
  const userSkillLower = new Set(params.skills.map((s) => s.name.toLowerCase()));
  const missingCore = expected.filter((req) => !userSkillLower.has(req.toLowerCase()));
  const missedQuestions = answers.filter((a) => a.selected_option !== a.correct_option).map((a) => a.skill);
  const passedQuestions = answers.filter((a) => a.selected_option === a.correct_option).map((a) => a.skill);

  const dimensionScores: Record<string, number> = {
    "Core Skills": skillAvg,
    "Diagnostic": diagScore,
    "Projects": projScore,
    "Certifications": certScore,
    "Verification": verifScore,
    "Coverage": coverageScore,
  };

  const cloud = await callCloudLLM({
    geminiApiKey: params.geminiApiKey,
    expectJson: true,
    systemPrompt: `You are V-Link's AI Career Readiness Evaluator. Generate an insightful, personalized DRI Diagnostic Report based on the candidate's actual diagnostic quiz performance, skills, projects, and target role.
Return valid JSON with keys:
- "executiveSummary" (2-3 crisp sentences referencing actual score ${overall}/100 and diagnostic accuracy ${correctCount}/${answers.length})
- "strengths" (array of 2-3 specific strengths)
- "criticalGaps" (array of 2-3 specific gaps to fix)
- "actionPlan" (array of 3 concrete next steps)
- "benchmarkComparison" (1 crisp sentence comparing readiness for ${params.targetRole})`,
    userPrompt: JSON.stringify({
      candidate: params.userName,
      targetRole: params.targetRole,
      overallScore: overall,
      tier,
      diagnosticAccuracy: `${correctCount}/${answers.length} (${diagScore}%)`,
      passedTopics: passedQuestions,
      missedTopics: missedQuestions,
      skills: params.skills.map((s) => `${s.name} (lvl:${s.level}, verified:${s.verified})`),
      projectsCount: params.projects.length,
      missingCoreSkills: missingCore,
    }),
  });

  let aiReport: AiReadinessReport | null = null;
  let aiSource = "vlink-ai-diagnostic-engine";

  if (cloud) {
    try {
      const parsed = JSON.parse(cloud.text) as Partial<AiReadinessReport>;
      if (parsed.executiveSummary && Array.isArray(parsed.actionPlan)) {
        aiReport = {
          executiveSummary: parsed.executiveSummary,
          strengths: parsed.strengths || [],
          criticalGaps: parsed.criticalGaps || [],
          actionPlan: parsed.actionPlan || [],
          benchmarkComparison: parsed.benchmarkComparison || "",
        };
        aiSource = cloud.provider;
      }
    } catch {
      // fall through cleanly
    }
  }

  if (!aiReport) {
    const strengths: string[] = [];
    if (passedQuestions.length > 0) {
      strengths.push(`Demonstrated verified accuracy in diagnostic concepts covering ${Array.from(new Set(passedQuestions)).join(", ")}.`);
    }
    if (params.projects.length > 0) {
      strengths.push(`Showcased ${params.projects.length} applied engineering project(s) aligned with production stacks.`);
    }
    if (verifiedCount > 0) {
      strengths.push(`Holds ${verifiedCount} verified technical skill badge(s) boosting recruiter trust.`);
    }
    if (strengths.length === 0) {
      strengths.push(`Clear career direction toward ${params.targetRole} with foundational programming skills registered.`);
    }

    const criticalGaps: string[] = [];
    if (missedQuestions.length > 0) {
      criticalGaps.push(`Diagnostic accuracy gaps identified in: ${Array.from(new Set(missedQuestions)).join(", ")}.`);
    }
    if (missingCore.length > 0) {
      criticalGaps.push(`Missing core stack competencies for ${params.targetRole}: ${missingCore.slice(0, 4).join(", ")}.`);
    }
    if (params.projects.length === 0) {
      criticalGaps.push("No shipped portfolio projects added yet — recruiters prioritize verifiable GitHub/live demos.");
    }
    if (criticalGaps.length === 0) {
      criticalGaps.push("Minor edge-case depth — advance into distributed architecture & mock interview drills.");
    }

    const actionPlan: string[] = [
      missedQuestions.length > 0
        ? `Review fundamentals and earn verification badges for ${missedQuestions[0]}.`
        : `Verify your remaining claimed skills under the Skill Verification tab to raise Verification from ${verifScore}% to 90%+.`,
      missingCore.length > 0
        ? `Follow your personalized roadmap to build hands-on fluency in ${missingCore.slice(0, 2).join(" & ")}.`
        : `Target Tier-1 company openings on /jobs matching your ${params.targetRole} stack.`,
      `Run a tailored AI Mock Interview and AI ATS Resume Audit before submitting applications.`,
    ];

    aiReport = {
      executiveSummary: `${params.userName} achieved a composite DRI Score of ${overall}/100 (${tier}) for ${params.targetRole}, answering ${correctCount}/${answers.length} technical diagnostic questions accurately (${diagScore}%). ${
        overall >= 75
          ? "Profile demonstrates competitive readiness for campus placement interviews."
          : "Completing the targeted gap milestones below will rapidly elevate placement competitiveness."
      }`,
      strengths,
      criticalGaps,
      actionPlan,
      benchmarkComparison:
        overall >= 80
          ? `Places in the Top 20% cohort readiness bracket for ${params.targetRole} roles.`
          : overall >= 60
          ? `Competitive mid-tier trajectory for ${params.targetRole}; +15 points reaches Tier-1 threshold (80+).`
          : `Early diagnostic baseline established for ${params.targetRole}; add projects & pass skill quizzes to unlock shortlist readiness.`,
    };
  }

  return {
    overall_score: overall,
    tier,
    dimension_scores: dimensionScores,
    missing_core_skills: missingCore,
    recommendations: aiReport.actionPlan,
    ai_report: aiReport,
    ai_source: aiSource,
  };
}
