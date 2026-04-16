import { generateTaskCode, randomSuffix } from "./taskCode";

describe("taskCode", () => {
  test("matches TSK-<digits>-<3 alnum> pattern", () => {
    const code = generateTaskCode();
    expect(code).toMatch(/^TSK-\d{4}-[A-Z0-9]{3}$/);
  });

  test("suffix length", () => {
    expect(randomSuffix(4).length).toBe(4);
  });
});
