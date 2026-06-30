# Employee Polls

Employee Polls is a React and Redux single-page app built for Udacity's React Nanodegree. Employees can sign in as seeded users, answer "Would you rather...?" questions, create new polls, and compare participation on a leaderboard.

Live site: https://devin-thomas.github.io/employee-polls/

## Features

- Username and password login for seeded users
- Answered and unanswered poll views sorted by recency
- Poll detail pages with vote totals, percentages, and the current user's selection
- New poll creation flow backed by the provided fake API
- Leaderboard ranked by total participation
- Protected routes with post-login redirect handling

## Tech Stack

- React 19
- Redux Toolkit
- React Router
- Vite
- Vitest and Testing Library

## Local Setup

```bash
npm install
npm start
```

The development server runs on the default Vite port. To create a production build:

```bash
npm run build
```

To run the test suite and lint checks:

```bash
npm run test -- --run
npm run lint
```

## Seeded Accounts

- `sarahedo` / `password123`
- `tylermcginnis` / `abc321`
- `mtsamis` / `xyz123`
- `zoshikanlu` / `pass246`

## Testing

The project includes 16 passing tests that cover:

- `_saveQuestion` success and failure cases
- `_saveQuestionAnswer` success and failure cases
- snapshot rendering
- DOM interaction with `fireEvent`
- login redirects, logout, voting, poll creation, and leaderboard behavior

## Implementation Notes

- The Redux store is the source of truth for authenticated session state, users, and polls. Auth state is intentionally memory-only so a hard-loaded protected URL asks the user to log in before showing the requested page.
- The starter `_DATA.js` module remains the fake backend, with avatar URLs generated at load time so the UI stays self-contained.
- Routing uses `HashRouter` on GitHub Pages and `BrowserRouter` locally. Vite's production base path is pinned to `/employee-polls/` so deployed assets resolve correctly.

## Deployment

GitHub Actions builds and deploys the app to GitHub Pages from the `main` branch. The workflow also runs lint, test, and build checks before deployment.
