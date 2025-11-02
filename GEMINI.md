This is an audio streaming application currently undergoing a major refactor to a client-side rendered, reactive architecture using Solid.js.

The core of the application is a reactive, store-based state management system. A custom, state-driven routing system has been intentionally implemented to meet unique application requirements.

The current remaining before the refactor is complete:
- working cloudsync
- proper error handling
- efficient communication patterns
- efficient use of solidjs

tips:
- A strong preference for fully-typed, generic, and reusable code over quick fixes. avoid the use of `any`.
- Prefers Promise-based `.then().catch()` syntax over `async/await` with `try...catch` blocks.
- Analyzes build errors and existing code thoroughly before making changes.
- Keen on identifying opportunities for optimization, code reduction, and file consolidation to avoid redundancy.
- npm run build - ignore environmental build errors, its a known issue
- git diff analysis to form a proper git message.
- git - when the task is achieved run the build, prompt user for pushing code via asking for git status permission, form the git commit message based on the status, most of the times you need to add all files, git add , commit, push at once.

