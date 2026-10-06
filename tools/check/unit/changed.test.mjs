/* Which browser checks a change needs: tools/check/changed.mjs. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { classify } from "../changed.mjs";

const none = { site: false, behavior: false, builder: false };
const all = { site: true, behavior: true, builder: true };

test("a changelog entry, a doc, or the release needs no browser check", () => {
  assert.deepEqual(classify(["changes/thing.md"]), none);
  assert.deepEqual(classify(["docs/changelog.md", "CONTRIBUTING.md"]), none);
  assert.deepEqual(
    classify(["CHANGELOG.md", "changes/a.md", "changes/b.md", "guide/changelog.html", "package.json", "package-lock.json"], { versionOnly: ["package.json", "package-lock.json"] }),
    none, "the release pull request");
  assert.deepEqual(classify(["tools/check/unit/store.test.mjs"]), none, "a unit test runs in the build job");
  assert.deepEqual(classify(["assets/search-data.js", "guide/changelog.md"]), none, "search data regenerates from any page");
});

test("a page or card runs the site check alone", () => {
  assert.deepEqual(classify(["guide/working-together.html", "CONTRIBUTING.md"]), { site: true, behavior: false, builder: false }, "a rebuilt guide page");
  assert.deepEqual(classify(["previews/Button.html"]), { site: true, behavior: false, builder: false });
  assert.deepEqual(classify(["components/Button.html", "system/components/actions/Button.md"]), { site: true, behavior: false, builder: false }, "a component's own doc and its page");
});

test("the builder's files run the builder check; a component runs every check", () => {
  assert.deepEqual(classify(["assets/builder/app/App.js", "assets/builder.js", "builder.html"]), { site: true, behavior: false, builder: true });
  assert.deepEqual(classify(["assets/theme.js"]), { site: true, behavior: false, builder: true });
  assert.deepEqual(classify(["system/components/actions/Button.jsx", "system/components/bundle.js"]), all);
  assert.deepEqual(classify(["system/tokens/semantic/color.css"]), all);
});

test("the workflow, the lockfile and a dependency change run everything", () => {
  assert.deepEqual(classify([".github/workflows/checks.yml"]), all);
  assert.deepEqual(classify(["package-lock.json", "changes/x.md"]), all);
  assert.deepEqual(classify(["package.json"]), all, "a dependency, not just the version");
  assert.deepEqual(classify(["package.json", "package-lock.json"], { versionOnly: ["package.json"] }), all, "a lockfile change beyond the version");
  assert.deepEqual(classify(["tools/check/serve.mjs"]), all);
});
