import { describe, expect, it } from "vitest";
import { DEFAULT_PROJECT, DEFAULT_TWEAK } from "./defaults.ts";
import { addTweak, removeTweak, updateIdentity, updateTweak } from "./project.ts";

describe("project operations", () => {
  it("adds, edits and removes tweaks immutably", () => {
    const added = { ...DEFAULT_TWEAK, id: "second_item", valueName: "Second" };
    const afterAdd = addTweak(DEFAULT_PROJECT, added);
    const edited = { ...added, label: "Edited" };
    const afterEdit = updateTweak(afterAdd, edited);
    const afterRemove = removeTweak(afterEdit, DEFAULT_TWEAK.id);

    expect(DEFAULT_PROJECT.tweaks).toHaveLength(1);
    expect(afterAdd.tweaks).toHaveLength(2);
    expect(afterEdit.tweaks[1]?.label).toBe("Edited");
    expect(afterRemove.tweaks).toEqual([edited]);
  });

  it("updates only project identity fields", () => {
    const result = updateIdentity(DEFAULT_PROJECT, {
      title: "New",
      bannerText: "NEW",
      bannerStyle: "ghost",
      subtitle: "Identity",
      theme: "ice",
    });
    expect(result.tweaks).toBe(DEFAULT_PROJECT.tweaks);
    expect(result.theme).toBe("ice");
    expect(result.bannerStyle).toBe("ghost");
  });
});
