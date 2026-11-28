import { describe, it, expect } from "vitest";
import { PRACTICES, PRACTICE_LABEL, roleGroupsForPractice, allRoleTitles, BOARD_AND_CEO_GROUP } from "@/lib/practices";

describe("practices", () => {
  it("has a label for every practice", () => {
    for (const practice of PRACTICES) {
      expect(PRACTICE_LABEL[practice]).toBeTruthy();
    }
  });

  it("gives every practice its three groups plus Board and CEO at the end", () => {
    for (const practice of PRACTICES) {
      const groups = roleGroupsForPractice(practice);
      expect(groups).toHaveLength(4);
      expect(groups.at(-1)).toEqual(BOARD_AND_CEO_GROUP);
      for (const group of groups) {
        expect(group.titles.length).toBeGreaterThan(0);
      }
    }
  });

  it("flattens every title with no duplicates lost silently", () => {
    const titles = allRoleTitles();
    expect(titles.length).toBeGreaterThan(20);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
