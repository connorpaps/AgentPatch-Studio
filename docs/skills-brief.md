# AgentPatch Studio — skills.sh Companion Brief for Kimi K2.7 Code

This document should be used alongside the main AgentPatch Studio technical spec. Its purpose is to tell Kimi K2.7 Code which skills from [skills.sh](https://www.skills.sh/) are actually worth installing for this project, and which ones should be avoided. The goal is not to install many skills. The goal is to install only the smallest set of skills that materially improve implementation quality for this specific product.[cite:139][cite:140]

## Core instruction

Do **not** browse skills.sh and install many skills by default. More skills will not automatically make the project better. Excess skill usage can introduce noise, conflicting patterns, overengineering, irrelevant vendor lock-in, and unnecessary complexity.

Treat skills as highly selective implementation accelerators. Only install skills that directly support the chosen stack and the actual product requirements of AgentPatch Studio.[cite:140]

## Product context

AgentPatch Studio is a full-stack web application for debugging, replaying, comparing, evaluating, and improving AI agent workflows. It is a workplace-oriented developer tool, not a marketing website, mobile app, or consumer product. The build priorities are:

- production-quality React/Next.js frontend architecture,
- clean and professional UI implementation,
- strong Postgres-oriented backend/data modeling,
- meaningful test coverage for complex workflows,
- support for AI agent traces, spans, evals, artifacts, and review flows,
- disciplined engineering over feature sprawl.

That context should govern all skill decisions.

## Skills to install

Install only the following categories first. These are the crucial skills most likely to improve the quality of this project without bloating the workflow. The goal is to install a **small core set** and use them deliberately.

## Installation workflow

Before installing anything:

1. Search skills.sh for the exact best-matching skill names inside the approved categories.[cite:139][cite:140]
2. List the candidate skill names before installing them.
3. Prefer project-level installation over broad global installation unless there is a strong reason not to.
4. Use the skills.sh CLI flow to install the selected skills, typically via `npx skills add ...` or the equivalent official installer flow shown on the skill page.[cite:154][cite:155][cite:157]
5. After installation, verify that the skills are visible and usable in the current project environment.[cite:166][cite:167]
6. If there are multiple similar skills in one category, choose the most focused and best-maintained option instead of installing several overlapping ones.

If the exact skill name is uncertain, Kimi K2.7 Code should first discover the options, then choose the cleanest and most relevant one instead of guessing.

### 1. React topic skills

Why install:

- AgentPatch has a complex frontend with trace viewers, filters, tables, compare views, inspectors, and interaction-heavy components.
- The React topic on skills.sh is specifically positioned around performance rules, component patterns, and ecosystem knowledge for production-quality React.[cite:140]
- This is directly useful for keeping the UI maintainable and not turning the app into a pile of tangled state.

Install instruction:

- Search the React topic on skills.sh and identify 1 to 2 focused React skills that improve component architecture, state handling, rendering performance, and scalable UI composition.[cite:140]
- Install only the strongest match or strongest two matches using the official skills.sh installation flow, such as `npx skills add <skill-identifier>` if that is the installer shown on the skill page.[cite:154][cite:155]
- After installation, verify that the installed React skills can be invoked in Cursor for frontend architecture tasks.[cite:166][cite:167]

Usage instruction:

- Use these React skills when building complex views like the trace viewer, compare view, filters, and inspector panes.
- Prefer skills that improve structure and maintainability over flashy UI generation.

### 2. Next.js topic skills

Why install:

- The recommended frontend stack for AgentPatch is Next.js.
- The Next.js topic on skills.sh covers App Router, server components, caching APIs, and Vercel deployment patterns.[cite:140]
- These are relevant to building a modern, production-style app with clean routing, data fetching, and deployment conventions.

Install instruction:

- Search the Next.js topic on skills.sh and choose 1 focused Next.js skill that is clearly strong on App Router structure, route organization, server/client boundaries, and production implementation patterns.[cite:140]
- Install that skill using the official skills.sh CLI flow shown on the skill page.[cite:154][cite:157]
- Verify that the skill is available before using it to scaffold app structure or route patterns.[cite:166]

Usage instruction:

- Use this skill for project structure, routing, loading patterns, data fetching boundaries, and deployment-aware decisions.
- Do not allow it to push the project into unnecessary complexity or experimental abstractions.

### 3. Databases topic skills

Why install:

- AgentPatch depends heavily on schema design, migrations, queries, indexing, and relationships across projects, workflows, runs, spans, artifacts, evals, annotations, and review queues.
- The Databases topic on skills.sh includes Postgres and adjacent database tooling for correct queries, schemas, and migrations.[cite:140]
- This is one of the highest-value skill areas for the project.

Install instruction:

- Search the Databases topic on skills.sh and choose 1 skill that is best aligned with PostgreSQL-first schema design, migration discipline, and relational data modeling.[cite:140]
- Install it using the official skills.sh installation method shown on the selected skill page.[cite:154][cite:157]
- Verify that the skill is available before using it for schema design, migration planning, or query reviews.[cite:166]

Usage instruction:

- Use this skill when designing the run/span/eval schema, indexes, foreign-key relationships, migrations, and query structure.
- Prefer pragmatic correctness and maintainability over speculative optimization.

### 4. Testing topic skills

Why install:

- This project has complex user workflows that are easy to break without verification.
- The Testing topic on skills.sh emphasizes TDD loops, Playwright automation, and meaningful tests over empty coverage metrics.[cite:140]
- That is exactly the right philosophy for AgentPatch.

Install instruction:

- Search the Testing topic on skills.sh and choose 1 testing skill that is strongest for Playwright-style end-to-end validation and meaningful workflow testing.[cite:140]
- Install it using the official skills.sh CLI install pattern or the command shown on the skill page.[cite:154][cite:157]
- Verify the installation before generating test plans or end-to-end suites.[cite:166]

Usage instruction:

- Use this skill to validate the main user journeys: trace viewing, run comparison, eval creation, and review queue flows.
- Do not generate tests that only chase superficial line coverage.

### 5. Design topic skills

Why install:

- AgentPatch needs a visually strong interface, but the design goal is restrained, minimal, professional, and workplace-ready.
- The Design topic on skills.sh is positioned around taste and frameworks for polished interfaces.[cite:140]
- This is useful only if it reinforces the cleaner design direction already defined in the main spec.

Install instruction:

- Search the Design topic on skills.sh and choose 1 design skill that helps with layout clarity, visual hierarchy, spacing, typography, and professional product polish.[cite:140]
- Install it only after the React and Next.js skills are selected, so the design guidance supports the chosen frontend implementation.
- Use the official installer command shown on the selected skill page, then verify availability inside the project environment.[cite:154][cite:166]

Usage instruction:

- Use this skill to refine the interface system, not to reinvent the product visually from scratch.
- Reject any design skill output that creates neon AI aesthetics, crowded dashboards, or generic SaaS card overload.
- Follow the UI direction in the main AgentPatch spec over any conflicting design-skill tendency.

## Optional skills to install only if the stack confirms them

These skills are conditionally useful. Do not install them unless the chosen implementation genuinely uses their ecosystem.

### 6. Langfuse official skills — optional

Why it may help:

- Langfuse is directly adjacent to trace collection, observability, and AI engineering workflows.[cite:139]
- It may provide useful implementation patterns or compatibility ideas for tracing and evaluation.

When to install:

- Only if the project uses Langfuse concepts, a Langfuse-compatible demo flow, or explicit Langfuse-style instrumentation ideas.
- Skip if the app remains fully custom.

### 7. OpenAI official skills — optional

Why it may help:

- OpenAI skills may help if the demo agent or eval workflow directly depends on OpenAI APIs.[cite:139]

When to install:

- Only if the actual implementation uses OpenAI in the demo agent or evaluation layer.
- Skip if model access is abstracted or provider-agnostic.

### 8. Vercel official or Vercel Labs skills — optional

Why it may help:

- If the frontend is deployed on Vercel and tightly coupled to Next.js deployment patterns, these may be helpful.[cite:139]

When to install:

- Only if the deployment plan truly centers on Vercel and the skill helps with production setup.
- Do not install just because Next.js is being used.

### 9. Prisma official skills — optional

Why it may help:

- Could help if Prisma becomes the ORM layer for Postgres.[cite:139]

When to install:

- Only if Prisma is explicitly chosen.
- Do not install if using SQLAlchemy, Drizzle, raw SQL migrations, or another data layer.

### 10. Sentry official skills — optional

Why it may help:

- Sentry may help with monitoring the app itself, especially frontend and backend runtime issues.[cite:139]

When to install:

- Only if app-level error monitoring becomes part of the implementation.
- This is secondary, not core.

## Skills to avoid

Do **not** install these unless the project scope changes substantially.

### Mobile skills

Avoid Expo, React Native, Flutter, and related mobile-oriented skills because AgentPatch is a desktop-oriented workplace web tool, not a mobile app.[cite:140][cite:139]

### Marketing / SEO / growth skills

Avoid SEO, growth, CRO, and copywriting skill sets because the project is not a content site or growth funnel.[cite:140]

### Commerce / CMS / unrelated vendor stacks

Avoid skills related to Shopify, Webflow, WordPress, Contentful, Medusa, OpenSea, Stripe billing, or similar ecosystems unless the product scope changes dramatically.[cite:139]

### Voice / media / creative generation skills

Avoid ElevenLabs, Runway, Remotion, and similar media-oriented skills unless a launch video or secondary presentation asset is intentionally being built.[cite:139]

### Large cloud-vendor bundles by default

Avoid pulling in broad AWS, Azure, or Cloudflare skill families unless the deployment stack is explicitly committed to them. Do not let vendor skills dictate architecture prematurely.[cite:139]

### Autonomous agent-loop skills unless justified

The Agent Workflows topic may be useful in moderation, but do not install a large set of autonomous-loop or subagent-heavy skills just to appear advanced. AgentPatch should look disciplined and product-focused, not like an overcomplicated AI experiment.[cite:140]

## Recommended install order

Use this order so the build stays focused:

1. React topic skills.[cite:140]
2. Next.js topic skills.[cite:140]
3. Design topic skills.[cite:140]
4. Databases topic skills.[cite:140]
5. Testing topic skills.[cite:140]
6. One optional ecosystem skill only if the implementation truly depends on it.[cite:139]

Do not expand beyond this set unless a concrete implementation blocker appears.

## Operational instruction for Kimi K2.7 Code

When using skills during development:

- Apply skills only when they are relevant to the current task.
- Prefer the simplest skill that solves the problem well.
- If two skills conflict, favor the main AgentPatch product spec and the cleaner workplace-oriented UI direction.
- Do not refactor architecture just because a skill suggests a different stack or pattern.
- Do not introduce extra services, providers, or abstractions unless they directly improve the product.
- Keep the system understandable to a solo engineer or small team working in a 1–3 month window.

## Final recommendation

The correct approach is **not** “use many skills.” The correct approach is to use a small set of skills that strengthen the app’s frontend architecture, visual quality, database design, and testing discipline while avoiding irrelevant ecosystems and unnecessary complexity.[cite:139][cite:140]

For AgentPatch Studio, the default approved skills are:

- React topic skills.[cite:140]
- Next.js topic skills.[cite:140]
- Design topic skills.[cite:140]
- Databases topic skills.[cite:140]
- Testing topic skills.[cite:140]

Everything else should be treated as optional and justified only by real implementation choices, not by novelty.

## One more safety rule

Before installing any optional skill, confirm that it is needed for the current stack and current milestone. Optional skills like Langfuse, OpenAI, Prisma, Vercel, and Sentry should remain optional until the implementation explicitly requires them.

## First-pass install order

Install only the five core categories first:

1. React.
2. Next.js.
3. Databases.
4. Testing.
5. Design.

Do not install any other skills before the first working version exists unless a hard implementation blocker appears.
