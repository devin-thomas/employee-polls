import {
  configureStore,
  createAsyncThunk,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";
import {
  loadInitialData as fetchInitialData,
  saveQuestion,
  saveQuestionAnswer,
} from "./api";

const SESSION_STORAGE_KEY = "employee-polls-session";

function readSessionUser() {
  try {
    return window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeSessionUser(userId) {
  try {
    if (userId) {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, userId);
    } else {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Session persistence is best-effort only.
  }
}

export const initializeApp = createAsyncThunk(
  "polls/initializeApp",
  async () => fetchInitialData()
);

export const loginUser = createAsyncThunk(
  "session/loginUser",
  async ({ username, password }, { getState, rejectWithValue }) => {
    const user = getState().polls.users[username];

    if (!user || user.password !== password) {
      return rejectWithValue("Incorrect username or password.");
    }

    writeSessionUser(user.id);
    return user.id;
  }
);

export const createPoll = createAsyncThunk(
  "polls/createPoll",
  async ({ optionOneText, optionTwoText }, { getState }) => {
    const author = getState().session.authedUser;
    return saveQuestion({ author, optionOneText, optionTwoText });
  }
);

export const submitAnswer = createAsyncThunk(
  "polls/submitAnswer",
  async ({ qid, answer }, { getState }) => {
    const authedUser = getState().session.authedUser;
    await saveQuestionAnswer({ authedUser, qid, answer });
    return { qid, answer, authedUser };
  }
);

const pollsSlice = createSlice({
  name: "polls",
  initialState: {
    users: {},
    questions: {},
    status: "idle",
    error: "",
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(initializeApp.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(initializeApp.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.users = action.payload.users;
        state.questions = action.payload.questions;
      })
      .addCase(initializeApp.rejected, (state) => {
        state.status = "failed";
        state.error = "The employee polls data could not be loaded.";
      })
      .addCase(createPoll.fulfilled, (state, action) => {
        const question = action.payload;
        state.questions[question.id] = question;
        state.users[question.author].questions.push(question.id);
      })
      .addCase(submitAnswer.fulfilled, (state, action) => {
        const { qid, answer, authedUser } = action.payload;
        state.users[authedUser].answers[qid] = answer;
        state.questions[qid][answer].votes.push(authedUser);
      });
  },
});

const sessionSlice = createSlice({
  name: "session",
  initialState: {
    authedUser: readSessionUser(),
    status: "idle",
    error: "",
  },
  reducers: {
    logout(state) {
      state.authedUser = null;
      state.error = "";
      writeSessionUser(null);
    },
    clearError(state) {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.authedUser = action.payload;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const { clearError, logout } = sessionSlice.actions;

export function createAppStore() {
  return configureStore({
    reducer: {
      polls: pollsSlice.reducer,
      session: sessionSlice.reducer,
    },
  });
}

export const store = createAppStore();

export function selectAuthedUser(state) {
  return state.session.authedUser
    ? state.polls.users[state.session.authedUser]
    : null;
}

const selectQuestions = (state) => state.polls.questions;
const selectUsers = (state) => state.polls.users;

export const selectSortedQuestionIds = createSelector(
  [selectQuestions],
  (questions) =>
    Object.values(questions)
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((question) => question.id)
);

export function selectQuestionById(state, questionId) {
  return state.polls.questions[questionId] || null;
}

export const selectLeaderboard = createSelector([selectUsers], (users) =>
  Object.values(users)
    .map((user) => ({
      ...user,
      answeredCount: Object.keys(user.answers).length,
      createdCount: user.questions.length,
      totalScore: Object.keys(user.answers).length + user.questions.length,
    }))
    .sort((a, b) => b.totalScore - a.totalScore)
);

export function makeEmptyState() {
  return {
    polls: {
      users: {},
      questions: {},
      status: "idle",
      error: "",
    },
    session: {
      authedUser: null,
      status: "idle",
      error: "",
    },
  };
}
