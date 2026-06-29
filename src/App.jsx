import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  BrowserRouter,
  HashRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  clearError,
  createPoll,
  initializeApp,
  loginUser,
  logout,
  selectAuthedUser,
  selectLeaderboard,
  selectQuestionById,
  selectSortedQuestionIds,
  submitAnswer,
} from "./store";

const Router = window.location.hostname.includes("github.io")
  ? HashRouter
  : BrowserRouter;

function ProtectedRoute({ children }) {
  const authedUser = useSelector((state) => state.session.authedUser);
  const location = useLocation();

  if (!authedUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

function AppLayout({ children }) {
  const dispatch = useDispatch();
  const authedUser = useSelector(selectAuthedUser);

  return (
    <div className="app-shell">
      {authedUser ? (
        <header className="topbar">
          <Link className="brand" to="/">
            Employee Polls
          </Link>
          <nav className="topnav">
            <Link to="/">Home</Link>
            <Link to="/add">New Poll</Link>
            <Link to="/leaderboard">Leaderboard</Link>
          </nav>
          <div className="topbar-user">
            <img src={authedUser.avatarURL} alt="" className="avatar avatar-small" />
            <span>{authedUser.name}</span>
            <button
              className="button button-secondary"
              onClick={() => dispatch(logout())}
            >
              Logout
            </button>
          </div>
        </header>
      ) : null}
      <main className="content">{children}</main>
    </div>
  );
}

function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, error } = useSelector((state) => state.session);
  const [form, setForm] = useState({ username: "", password: "" });

  const targetPath = location.state?.from?.pathname || "/";

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  return (
    <div className="centered-panel">
      <form
        className="card auth-card"
        onSubmit={async (event) => {
          event.preventDefault();
          const result = await dispatch(loginUser(form));
          if (loginUser.fulfilled.match(result)) {
            navigate(targetPath, { replace: true });
          }
        }}
      >
        <p className="eyebrow">Stand-out login flow</p>
        <h1>Sign in</h1>
        <p>Use one of the seeded users from the fake backend to enter the app.</p>
        <label>
          Username
          <input
            type="text"
            value={form.username}
            onChange={(event) =>
              setForm((current) => ({ ...current, username: event.target.value }))
            }
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
          />
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        <button className="button" type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Checking..." : "Login"}
        </button>
        <div className="hint-list">
          <strong>Seeded users</strong>
          <span>`sarahedo` / `password123`</span>
          <span>`tylermcginnis` / `abc321`</span>
        </div>
      </form>
    </div>
  );
}

function QuestionPreview({ questionId }) {
  const question = useSelector((state) => selectQuestionById(state, questionId));
  const author = useSelector((state) => state.polls.users[question.author]);

  return (
    <article className="card poll-preview">
      <div className="poll-preview-header">
        <img src={author.avatarURL} alt="" className="avatar" />
        <div>
          <p className="eyebrow">Asked by {author.name}</p>
          <h3>Would you rather...</h3>
        </div>
      </div>
      <p>{question.optionOne.text}</p>
      <Link className="button button-secondary" to={`/questions/${question.id}`}>
        View poll
      </Link>
    </article>
  );
}

function HomePage() {
  const authedUser = useSelector((state) => state.session.authedUser);
  const questionIds = useSelector(selectSortedQuestionIds);
  const userAnswers = useSelector((state) => state.polls.users[authedUser].answers);
  const [activeTab, setActiveTab] = useState("unanswered");

  const answeredIds = questionIds.filter((questionId) => userAnswers[questionId]);
  const unansweredIds = questionIds.filter((questionId) => !userAnswers[questionId]);
  const visibleIds = activeTab === "answered" ? answeredIds : unansweredIds;

  return (
    <section className="stack-lg">
      <div className="hero">
        <div>
          <p className="eyebrow">Internal collaboration dashboard</p>
          <h1>Vote, compare, and keep decisions visible</h1>
        </div>
      </div>
      <div className="toggle-bar">
        <button
          className={`tab ${activeTab === "unanswered" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("unanswered")}
        >
          Unanswered ({unansweredIds.length})
        </button>
        <button
          className={`tab ${activeTab === "answered" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("answered")}
        >
          Answered ({answeredIds.length})
        </button>
      </div>
      <div className="poll-grid">
        {visibleIds.map((questionId) => (
          <QuestionPreview key={questionId} questionId={questionId} />
        ))}
      </div>
    </section>
  );
}

function QuestionPage() {
  const { questionId } = useParams();
  const dispatch = useDispatch();
  const question = useSelector((state) => selectQuestionById(state, questionId));
  const authedUser = useSelector((state) => state.session.authedUser);
  const author = useSelector((state) =>
    question ? state.polls.users[question.author] : null
  );
  const userAnswer = useSelector((state) =>
    question ? state.polls.users[authedUser].answers[question.id] : null
  );

  if (!question) {
    return <NotFoundPage />;
  }

  const totalVotes =
    question.optionOne.votes.length + question.optionTwo.votes.length;

  const renderOption = (optionKey, label) => {
    const option = question[optionKey];
    const votes = option.votes.length;
    const percentage = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
    const isChosen = userAnswer === optionKey;

    return (
      <div className={`option-card ${isChosen ? "option-card-active" : ""}`}>
        <p>{option.text}</p>
        {userAnswer ? (
          <div className="result-block">
            <strong>
              {votes} vote{votes === 1 ? "" : "s"} · {percentage}%
            </strong>
            {isChosen ? <span className="badge">Your choice</span> : null}
          </div>
        ) : (
          <button
            className="button"
            onClick={() => dispatch(submitAnswer({ qid: question.id, answer: optionKey }))}
          >
            Choose {label}
          </button>
        )}
      </div>
    );
  };

  return (
    <section className="centered-panel">
      <article className="card question-card">
        <div className="poll-preview-header">
          <img src={author.avatarURL} alt="" className="avatar" />
          <div>
            <p className="eyebrow">Asked by {author.name}</p>
            <h1>Would you rather...</h1>
          </div>
        </div>
        <div className="option-stack">
          {renderOption("optionOne", "option one")}
          {renderOption("optionTwo", "option two")}
        </div>
      </article>
    </section>
  );
}

function NewPollPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ optionOneText: "", optionTwoText: "" });

  return (
    <section className="centered-panel">
      <form
        className="card auth-card"
        onSubmit={async (event) => {
          event.preventDefault();
          const result = await dispatch(createPoll(form));
          if (createPoll.fulfilled.match(result)) {
            navigate("/");
          }
        }}
      >
        <p className="eyebrow">New poll</p>
        <h1>Would you rather...</h1>
        <label>
          First option
          <input
            type="text"
            value={form.optionOneText}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                optionOneText: event.target.value,
              }))
            }
          />
        </label>
        <label>
          Second option
          <input
            type="text"
            value={form.optionTwoText}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                optionTwoText: event.target.value,
              }))
            }
          />
        </label>
        <button
          className="button"
          type="submit"
          disabled={!form.optionOneText.trim() || !form.optionTwoText.trim()}
        >
          Create poll
        </button>
      </form>
    </section>
  );
}

function LeaderboardPage() {
  const leaderboard = useSelector(selectLeaderboard);

  return (
    <section className="stack-lg">
      <div className="hero hero-compact">
        <div>
          <p className="eyebrow">Leaderboard</p>
          <h1>Participation by user</h1>
        </div>
      </div>
      <div className="stack-md">
        {leaderboard.map((entry) => (
          <article key={entry.id} className="card leaderboard-row">
            <div className="poll-preview-header">
              <img src={entry.avatarURL} alt="" className="avatar" />
              <div>
                <h2>{entry.name}</h2>
                <p>{entry.createdCount} polls created</p>
                <p>{entry.answeredCount} polls answered</p>
              </div>
            </div>
            <div className="score-pill">{entry.totalScore} pts</div>
          </article>
        ))}
      </div>
    </section>
  );
}

function NotFoundPage() {
  return (
    <section className="centered-panel">
      <div className="card auth-card">
        <p className="eyebrow">404</p>
        <h1>That poll does not exist</h1>
        <Link className="button button-secondary" to="/">
          Return home
        </Link>
      </div>
    </section>
  );
}

function AppRoutes() {
  const dispatch = useDispatch();
  const status = useSelector((state) => state.polls.status);
  const error = useSelector((state) => state.polls.error);

  useEffect(() => {
    if (status === "idle") {
      dispatch(initializeApp());
    }
  }, [dispatch, status]);

  if (status === "loading" || status === "idle") {
    return <p className="loading-state">Loading polls...</p>;
  }

  if (status === "failed") {
    return <p className="loading-state error-text">{error}</p>;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/questions/:questionId"
          element={
            <ProtectedRoute>
              <QuestionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/add"
          element={
            <ProtectedRoute>
              <NewPollPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute>
              <LeaderboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <NotFoundPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
