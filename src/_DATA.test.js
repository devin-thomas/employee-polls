import { describe, expect, test, vi } from "vitest";

async function loadDataModule() {
  vi.resetModules();
  return import("../_DATA");
}

describe("_DATA", () => {
  test("_saveQuestion returns a formatted question when given valid input", async () => {
    const { _saveQuestion } = await loadDataModule();

    const result = await _saveQuestion({
      author: "sarahedo",
      optionOneText: "Ship the patch",
      optionTwoText: "Wait for review",
    });

    expect(result).toMatchObject({
      author: "sarahedo",
      optionOne: { text: "Ship the patch", votes: [] },
      optionTwo: { text: "Wait for review", votes: [] },
    });
    expect(result.id).toEqual(expect.any(String));
    expect(result.timestamp).toEqual(expect.any(Number));
  });

  test("_saveQuestion rejects invalid input", async () => {
    const { _saveQuestion } = await loadDataModule();

    await expect(
      _saveQuestion({
        author: "sarahedo",
        optionOneText: "Only one option",
      })
    ).rejects.toBe("Please provide optionOneText, optionTwoText, and author");
  });

  test("_saveQuestionAnswer returns true when given valid input", async () => {
    const { _saveQuestionAnswer } = await loadDataModule();

    await expect(
      _saveQuestionAnswer({
        authedUser: "sarahedo",
        qid: "vthrdm985a262al8qx3do",
        answer: "optionTwo",
      })
    ).resolves.toBe(true);
  });

  test("_saveQuestionAnswer rejects invalid input", async () => {
    const { _saveQuestionAnswer } = await loadDataModule();

    await expect(
      _saveQuestionAnswer({
        authedUser: "sarahedo",
        qid: "vthrdm985a262al8qx3do",
      })
    ).rejects.toBe("Please provide authedUser, qid, and answer");
  });
});
