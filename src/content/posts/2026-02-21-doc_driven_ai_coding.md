---
title: "Doc-driven AI Coding"
date: 2026-02-21
description: "Planning mode is cute, but someone needs to build a new kind of IDE only for production-grade vibecoding"
tags: [AI, IDE, Vibecoding]
category: rambling
slug: doc_driven_ai_coding
---

*Originally posted on [X](https://x.com/_seanzhang_/status/2025351740858794113).*

Planning mode is cute, but someone need to build a new kind of IDE only for production-grade vibecoding, and I don't mean a cursor/antigravity/windsurf/<10 other vscode clones> with an AI sidecar + an optional agentic entrypoint, I mean an doc-driven IDE that doesn't even permit human code writing/viewing by default, but still surface the complex structure of a production grade system.

This is how it works:

- instead of a tree of codes, humans see a tree of docs
- human and AI collboarate on the space of docs, not code
- AI does ALL the coding, human editing is exception, you don't get to see the code unless you try hard
- Critically, there's no "ask agent to do this, do that", agent is always working.  It constantly scans the repo and
  - reconciliate the inconsistency between docs, and respects your editing
  - reconcilate the inconsistency between doc and code, and if there's a feature mentioned in a doc that's not implemented in code, it executes on it autonomously
  - from the existing docs, it naturally proposes new features (in the form of docs) for human to review and co-design on

To give a concrete example, instead of

```
src/
├── auth/
│   ├── oauth.ts
│   ├── session.ts
│   ├── middleware.ts
│   └── __tests__/
│       ├── oauth.test.ts
│       └── session.test.ts
├── billing/
│   ├── stripe.ts
│   ├── invoice.ts
│   ├── webhook.ts
│   ├── plans.ts
│   └── __tests__/
│       ├── stripe.test.ts
│       └── invoice.test.ts
├── notifications/
│   ├── email.ts
│   ├── push.ts
│   ├── templates/
│   │   ├── welcome.html
│   │   └── reset.html
│   └── queue.ts
├── api/
│   ├── routes.ts
│   ├── validation.ts
│   └── ratelimit.ts
└── index.ts
```

we should have

```
docs/
├── auth/
│   ├── overview.md
│   ├── oauth-flow.md
│   └── session-management.md
├── billing/
│   ├── overview.md
│   ├── subscription-plans.md
│   └── webhook-handling.md
├── notifications/
│   ├── overview.md
│   └── delivery-channels.md
└── api/
    ├── overview.md
    └── rate-limiting.md
```

Why this design? because there're 2 main constraints in AI-coding that blocks an even greater productivity boost:

1. **human bandwidth are limited**: we get fatigued, we get sick, we have errands to run
2. **agents lack true long context capability**: and inevitably autonoums agent derail when things become complex

ps: 1M context is nothing when we are in the business of writing production grade software in a continuous evolving environment with no prior data

What this means is that we need human to correct agents, but we should be mindful when choosing the space in which humans and agents are collborating.

Uptil recently, the space had been chosen to be code, as it was the natural choice, but it probably deserves a second thought now.
