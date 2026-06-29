import {
  _getQuestions,
  _getUsers,
  _saveQuestion,
  _saveQuestionAnswer,
} from "../_DATA";

const avatarPalette = ["#7c3aed", "#ea580c", "#0891b2", "#16a34a"];

function makeAvatar(name, index) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const background = avatarPalette[index % avatarPalette.length];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="24" fill="${background}" />
      <text x="50%" y="56%" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="34" font-weight="700">${initials}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function enhanceUsers(users) {
  return Object.values(users).reduce((accumulator, user, index) => {
    accumulator[user.id] = {
      ...user,
      avatarURL: user.avatarURL || makeAvatar(user.name, index),
    };
    return accumulator;
  }, {});
}

export async function loadInitialData() {
  const [users, questions] = await Promise.all([_getUsers(), _getQuestions()]);

  return {
    users: enhanceUsers(users),
    questions,
  };
}

export async function saveQuestion(payload) {
  return _saveQuestion(payload);
}

export async function saveQuestionAnswer(payload) {
  return _saveQuestionAnswer(payload);
}
