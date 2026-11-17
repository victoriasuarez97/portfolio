export const experience = [
	{
		period: "Jun 2024 – now",
		location: "Remote · US",
		role: "Web Engineer → Software Engineer → Senior Software Engineer",
		company: "Swiftly",
		description:
			"I joined Swiftly to work on the Admin app used to configure retailer apps. Now I lead the centralized Admin experience, a single app on top of a large monolith serving enterprise clients.",
		bullets: [
			"Built and integrated an AI-powered chat experience into the Admin platform, connecting Claude with Databricks through MCP to help retailers explore their data.",
			"Designed and built a rule-based engine that fixes visual issues in promotional banners caused by dynamic content. It resizes and repositions elements to prevent overlaps, clipped text, and broken layouts. Turns out, visual problem-solving can be an algorithm too.",
			"Keep an eye on UI/UX quality across the platform. I review new features, catch visual inconsistencies, and work with engineers to make things feel right.",
			"Built our Storybook component library and keep it aligned with the design system. Especially useful on a team without a dedicated designer.",
			"Developed a Claude skill adopted by the engineering team to standardize frontend development practices and streamline code reviews.",
			"Set up the frontend testing practice with Vitest and React Testing Library.",
			"Write epics and acceptance criteria, prioritize work, and negotiate scope with stakeholders. Apparently, that's part of being an engineer too.",
		],
		technologies: [
			"Next.js",
			"TypeScript",
			"React",
			"Tailwind",
			"Vitest",
			"shadcn/ui",
			"Storybook",
			"design systems",
			"Claude",
			"Azure Foundry",
		],
	},
	{
		period: "Jun 2021 – Jun 2024",
		location: "Hybrid · BA",
		role: "Jr → Ssr Software Engineer",
		company: "Santander Tecnología",
		description:
			"Worked on Santander's broker app and its internal design system. This is where I got very into reusable components, frontend architecture, and caring probably too much about tiny UI details.",
		bullets: [
			"Built features in a micro-frontend architecture with Single SPA + React, working closely with UX and Business.",
			"Built and published reusable components for Santander's internal design system, used by several product teams and documented in Storybook.",
			"Worked with TDD before I had enough experience to complain about TDD.",
		],
		technologies: ["React", "TypeScript", "Single SPA", "TDD"],
	},
	{
		period: "Sep 2019 – Jun 2021",
		location: "Hybrid · BA",
		role: "Full Stack → Frontend Dev",
		company: "Accenture → AdCap",
		description:
			"My first years as a developer, across two companies and two very different roles. I started at Accenture working full stack with Angular, C# .NET Core, and SQL Server, then moved to AdCap, where I focused on frontend development with React.",
		bullets: [
			"Accenture: Worked across frontend and backend, learning how things fit together beyond the browser.",
			"AdCap: Built a trading dashboard using React, Redux, and Chart.js. Somewhere along the way, I realized CSS bugs were the kind of problem I preferred having.",
		],
		technologies: [
			"Angular",
			".NET Core",
			"SQL Server",
			"React",
			"Redux",
			"Chart.js",
		],
	},
	{
		period: "2016 – 2022",
		location: "Freelance · BA",
		role: "Illustrator & tattoo artist",
		company: "self-employed",
		description:
			"Before software, I spent six years doing illustration, prints and tattoos.",
		bullets: [
			"Ran the whole thing myself: briefs, pricing, revisions, deadlines, clients and the occasional creative crisis.",
			"Learned composition, colour and restraint.",
			"Probably overshared a little too much with my illustrations: everything I drew was about my life.",
		],
		technologies: ["illustration", "tattoo"],
	},
];
