import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import App from "./App";
import * as api from "./api";
import { createAppStore, makeEmptyState, selectLeaderboard } from "./store";

const mockData = {
  users: {
    sarahedo: {
      id: "sarahedo",
      password: "password123",
      name: "Sarah Edo",
      avatarURL: "avatar-a",
      answers: {},
      questions: ["q1", "q2"],
    },
    tylermcginnis: {
      id: "tylermcginnis",
      password: "abc321",
      name: "Tyler McGinnis",
      avatarURL: "avatar-b",
      answers: { q1: "optionOne" },
      questions: [],
    },
  },
  questions: {
    q1: {
      id: "q1",
      author: "sarahedo",
      timestamp: 2,
      optionOne: { votes: ["tylermcginnis"], text: "Ship today" },
      optionTwo: { votes: [], text: "Wait a week" },
    },
    q2: {
      id: "q2",
      author: "sarahedo",
      timestamp: 1,
      optionOne: { votes: [], text: "Remote" },
      optionTwo: { votes: [], text: "Hybrid" },
    },
  },
};

vi.mock("./api", async () => {
  const actual = await vi.importActual("./api");
  return {
    ...actual,
    loadInitialData: vi.fn(),
    saveQuestion: vi.fn(),
    saveQuestionAnswer: vi.fn(),
  };
});

function renderApp() {
  const testStore = createAppStore();
  return render(
    <Provider store={testStore}>
      <App />
    </Provider>
  );
}

function renderAppAtRoute(route) {
  window.history.pushState({}, "", route);
  return renderApp();
}

async function loginAs(user, username = "sarahedo", password = "password123") {
  await user.type(screen.getByLabelText("Username"), username);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Login" }));
}

describe("selectors", () => {
  test("sorts leaderboard users by total score", () => {
    const state = makeEmptyState();
    state.polls.users = mockData.users;

    const leaderboard = selectLeaderboard(state);
    expect(leaderboard[0].id).toBe("sarahedo");
  });
});

describe("Employee Polls", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
    window.sessionStorage.clear();
    api.loadInitialData.mockResolvedValue(structuredClone(mockData));
    api.saveQuestion.mockResolvedValue({
      id: "q3",
      author: "sarahedo",
      timestamp: 3,
      optionOne: { votes: [], text: "Remote" },
      optionTwo: { votes: [], text: "Hybrid" },
    });
    api.saveQuestionAnswer.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("rejects invalid credentials", async () => {
    const user = userEvent.setup();
    renderApp();

    await screen.findByText("Sign in");
    await user.type(screen.getByLabelText("Username"), "sarahedo");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(
      await screen.findByText("Incorrect username or password.")
    ).toBeInTheDocument();
  });

  test("matches the login page snapshot", async () => {
    const view = renderApp();

    await screen.findByText("Sign in");

    expect(view.asFragment()).toMatchSnapshot();
  });

  test("shows an error after a failed login with fireEvent", async () => {
    renderApp();

    await screen.findByText("Sign in");
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "sarahedo" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(
      await screen.findByText("Incorrect username or password.")
    ).toBeInTheDocument();
  });

  test("logs in and shows unanswered polls by default", async () => {
    const user = userEvent.setup();
    renderApp();

    await screen.findByText("Sign in");
    await loginAs(user);

    expect(
      (await screen.findAllByRole("link", { name: "View poll" })).length
    ).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Unanswered/ })).toHaveClass(
      "tab-active"
    );
  });

  test("asks the user to log in before showing a requested protected page", async () => {
    const user = userEvent.setup();
    renderAppAtRoute("/add");

    expect(await screen.findByText("Sign in")).toBeInTheDocument();
    expect(screen.queryByText("Would you rather...")).not.toBeInTheDocument();

    await loginAs(user);

    expect(
      await screen.findByRole("heading", { name: "Would you rather..." })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create poll" })).toBeInTheDocument();
  });

  test("logs out on address-bar reload and returns to the requested page after login", async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem("employee-polls-session", "sarahedo");
    renderAppAtRoute("/leaderboard?sort=points#top");

    expect(await screen.findByText("Sign in")).toBeInTheDocument();
    expect(screen.queryByText("Participation by user")).not.toBeInTheDocument();

    await loginAs(user);

    expect(
      await screen.findByRole("heading", { name: "Participation by user" })
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe("/leaderboard");
    expect(window.location.search).toBe("?sort=points");
    expect(window.location.hash).toBe("#top");
  });

  test("manual logout lets the next login start at home", async () => {
    const user = userEvent.setup();
    renderApp();

    await screen.findByText("Sign in");
    await loginAs(user);
    await user.click(await screen.findByRole("link", { name: "Leaderboard" }));
    await screen.findByRole("heading", { name: "Participation by user" });
    await user.click(screen.getByRole("button", { name: "Logout" }));

    expect(await screen.findByText("Sign in")).toBeInTheDocument();

    await loginAs(user, "tylermcginnis", "abc321");

    expect(
      await screen.findByRole("heading", {
        name: "Vote, compare, and keep decisions visible",
      })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unanswered (1)" })).toHaveClass(
      "tab-active"
    );
    expect(window.location.pathname).toBe("/");
  });

  test("creates a new poll", async () => {
    const user = userEvent.setup();
    renderApp();

    await screen.findByText("Sign in");
    await loginAs(user);

    await user.click(await screen.findByRole("link", { name: "New Poll" }));
    await user.type(screen.getByLabelText("First option"), "Remote");
    await user.type(screen.getByLabelText("Second option"), "Hybrid");
    await user.click(screen.getByRole("button", { name: "Create poll" }));

    await waitFor(() =>
      expect(api.saveQuestion).toHaveBeenCalledWith({
        author: "sarahedo",
        optionOneText: "Remote",
        optionTwoText: "Hybrid",
      })
    );
  });

  test("submits an answer for a poll", async () => {
    const user = userEvent.setup();
    renderApp();

    await screen.findByText("Sign in");
    await loginAs(user);

    const pollLinks = await screen.findAllByRole("link", { name: "View poll" });
    await user.click(pollLinks[0]);
    await user.click(screen.getByRole("button", { name: "Choose option one" }));

    await waitFor(() =>
      expect(api.saveQuestionAnswer).toHaveBeenCalledWith({
        authedUser: "sarahedo",
        qid: "q1",
        answer: "optionOne",
      })
    );
  });

  test("shows login first and then 404 for an invalid question id", async () => {
    const user = userEvent.setup();
    renderAppAtRoute("/questions/not-a-real-question");

    expect(await screen.findByText("Sign in")).toBeInTheDocument();
    expect(screen.queryByText("That poll does not exist")).not.toBeInTheDocument();

    await loginAs(user);

    expect(
      await screen.findByRole("heading", { name: "That poll does not exist" })
    ).toBeInTheDocument();
  });

  test("renders leaderboard totals in descending order", async () => {
    const user = userEvent.setup();
    renderApp();

    await screen.findByText("Sign in");
    await loginAs(user);
    await user.click(await screen.findByRole("link", { name: "Leaderboard" }));

    expect(
      await screen.findByRole("heading", { name: "Sarah Edo" })
    ).toBeInTheDocument();
    expect(screen.getByText("2 polls created")).toBeInTheDocument();
    expect(screen.getByText("0 polls answered")).toBeInTheDocument();
    expect(screen.getByText("2 pts")).toBeInTheDocument();
  });
});
