// ---------------------------------------------------------------------------
// PROFILE DATA  —  edit this file, then run:  node scripts/build.js
// Everything that appears in the README SVG comes from here. No placeholders.
// ---------------------------------------------------------------------------

module.exports = {
  name: "Manan N Ghodasara",
  handle: "purpoint",
  eyebrow: "PORTFOLIO · @purpoint",
  tagline: "Build. Break. Learn. Repeat.",
  monoline: "CODE · CREATE · SHIP",

  // three small pill labels in the hero
  heroPills: ["FULLSTACK · MERN", "AI / ML", "BENGALURU, IN"],

  // ABOUT card
  role: "FullStack MERN Developer",
  roleSub: "Computer Science Student",
  location: "Bengaluru, Karnataka, India",
  blurb:
    "Full-stack developer crafting real-time, AI-powered web apps — from socket servers and RAG pipelines to clean, fast React interfaces.",
  education: [
    "B.E. Computer Science · JSS Academy of Technical Education",
    "2023 – 2027   ·   CGPA 8.6 / 10",
  ],

  // FOUR value cards. accent: "purple" | "teal" | "magenta"
  values: [
    { label: "AI & FULL-STACK",   sub: "RAG, LLMs & end-to-end apps", accent: "purple"  },
    { label: "REAL-TIME SYSTEMS", sub: "Sockets, sync & low latency", accent: "teal"     },
    { label: "ALWAYS SHIPPING",   sub: "Ideas → deployed, fast",      accent: "purple"  },
    { label: "PROBLEM SOLVER",    sub: "DSA, C++ & clean logic",      accent: "magenta" },
  ],

  // FEATURED projects
  projects: [
    {
      name: "CollabBoard",
      desc: "Real-time collaborative whiteboard with sub-100ms multi-user sync.",
      tags: ["React", "Node", "Socket.IO", "MongoDB", "Redux"],
    },
    {
      name: "WasteIQ",
      desc: "AI-powered restaurant waste-management SaaS with demand forecasting.",
      tags: ["Next.js", "TypeScript", "PostgreSQL", "Prisma", "Groq AI"],
    },
    {
      name: "MindVault",
      desc: "AI personal knowledge system with a full RAG pipeline & vector search.",
      tags: ["React", "Pinecone", "Groq LLM", "HuggingFace", "MongoDB"],
    },
  ],

  // TECH STACK (grouped pills)
  stack: [
    { group: "LANGUAGES", items: ["JavaScript", "TypeScript", "Python", "C++"] },
    { group: "FRONTEND",  items: ["React", "Next.js", "Redux Toolkit", "Tailwind CSS", "Framer Motion"] },
    { group: "BACKEND",   items: ["Node.js", "Express", "FastAPI", "Socket.IO"] },
    { group: "DATABASES", items: ["MongoDB", "PostgreSQL (Prisma)", "Pinecone"] },
    { group: "AI / ML",   items: ["RAG Pipelines", "Groq LLM", "Gemini", "HuggingFace"] },
    { group: "DEVOPS",    items: ["AWS S3", "Git", "GitHub Actions", "Vercel", "Docker"] },
  ],

  // SOCIAL pill buttons (label shown on the SVG; url used in README fallback)
  socials: [
    { label: "GitHub",   url: "https://github.com/purpoint",                                  icon: "github"   },
    { label: "LinkedIn", url: "https://www.linkedin.com/in/manan-ghodasara-a85492359/",       icon: "linkedin" },
    { label: "Email",    url: "mailto:manan.xf.12@gmail.com",                                 icon: "mail"     },
  ],

  footer: "Designed & generated from scripts/build.js  ·  Bengaluru, IN",
};
