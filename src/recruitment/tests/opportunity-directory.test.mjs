import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as catalog from "../lib/catalog.ts";
import * as availability from "../lib/opportunity-availability.ts";

const require = createRequire(import.meta.url);
const { transformSync } = require("next/dist/build/swc");
const source = readFileSync(new URL("../../app/(recruitment)/recruitment/opportunities/opportunity-directory.tsx", import.meta.url), "utf8");
const { code } = transformSync(source, {
  jsc: { parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } } },
  module: { type: "commonjs" },
});
let search = "";
const modules = {
  "next/link": {
    __esModule: true,
    default: (linkProps) => {
      const anchorProps = { ...linkProps };
      delete anchorProps.scroll;
      return React.createElement("a", anchorProps);
    },
  },
  "next/navigation": { useRouter: () => ({}), useSearchParams: () => new URLSearchParams(search) },
  "@/recruitment/lib/catalog": catalog,
  "@/recruitment/lib/opportunity-availability": availability,
  "@/app/(recruitment)/recruitment/components/ui": {
    Icon: () => null,
    EmptyState: ({ heading: Heading, title, description, children }) => React.createElement("section", null,
      React.createElement(Heading, null, title), React.createElement("p", null, description), children),
  },
  "@/app/(recruitment)/recruitment/components/use-opportunity-availability": { useOpportunityAvailability: () => null },
  "@/app/(recruitment)/recruitment/apply/start-draft": {},
  "@/app/(recruitment)/recruitment/auth/actions": {},
  "@/app/(recruitment)/recruitment/components/access-guard": {},
};
const component = { exports: {} };
vm.runInNewContext(code, {
  URLSearchParams,
  exports: component.exports,
  require: name => modules[name] || require(name),
});
const { OpportunityDirectory } = component.exports;

test("continuation appears only for an existing applicant draft or submission", () => {
  for (const kind of ["anonymous", "unavailable", "unconfigured", "staff", "member"]) {
    const html = renderToStaticMarkup(React.createElement(OpportunityDirectory, { entry: { kind } }));
    assert.doesNotMatch(html, /Continue Application/);
  }
  for (const [hasDraft, submitted] of [[false, false], [true, false], [false, true], [true, true]]) {
    const html = renderToStaticMarkup(React.createElement(OpportunityDirectory, {
      entry: { kind: "applicant", applicant: {}, hasDraft, submitted },
    }));
    assert.equal(html.includes("Continue Application"), hasDraft || submitted);
    if (hasDraft || submitted) assert.match(html, /href="\/recruitment\/application\?resume=1"/);
  }
});

test("vacancy sorting uses remaining places, preserves ties and leaves catalog input intact", () => {
  const roles = catalog.opportunities.slice(0, 4);
  const original = [...roles];
  const data = { updatedAt: new Date().toISOString(), items: roles.map((role, index) => ({
    id: role.id, capacity: 8, remaining: [0, 3, 8, 3][index],
  })) };
  assert.deepEqual(availability.sortByVacancies(roles, data).map(role => role.id), [
    roles[2].id, roles[1].id, roles[3].id, roles[0].id,
  ]);
  assert.deepEqual(roles, original);
});

test("unavailable vacancy data retains the catalog order", () => {
  const roles = catalog.opportunities.slice(0, 4);
  assert.deepEqual(availability.sortByVacancies(roles, null), roles);
});


test("opportunities render in separate expanded tracks and respect search and filters", () => {
  try {
    const render = () => renderToStaticMarkup(React.createElement(OpportunityDirectory, { entry: { kind: "anonymous" } }));
    const html = render();
    const sections = [...html.matchAll(/<details class="roles-section"[^>]*data-track="([^"]+)"[^>]*open=""[^>]*>([\s\S]*?)<\/details>/g)];
    assert.deepEqual(sections.map(section => section[1]), ["CORE_TEAM", "COMMITTEE"]);
    assert.deepEqual(sections.map(section => [...section[2].matchAll(/class="role-card"/g)].length), [6, 10]);

    search = "track=CORE_TEAM";
    const core = render();
    assert.match(core, /class="roles-section" data-track="CORE_TEAM"/);
    assert.doesNotMatch(core, /class="roles-section" data-track="COMMITTEE"/);

    search = "q=web";
    const web = render();
    assert.doesNotMatch(web, /class="roles-section" data-track="CORE_TEAM"/);
    assert.match(web, /class="roles-section" data-track="COMMITTEE"/);
    assert.equal([...web.matchAll(/class="role-card"/g)].length, 1);
  } finally {
    search = "";
  }
});

test("an unmatched search retains the shared empty state and reset action", () => {
  try {
    search = "track=COMMITTEE&q=no-such-opportunity";
    const html = renderToStaticMarkup(React.createElement(OpportunityDirectory, { entry: { kind: "anonymous" } }));
    assert.match(html, /<h2>No matching roles<\/h2>/);
    assert.match(html, /Try a different department or search term/);
    assert.match(html, /Show all roles/);
    assert.doesNotMatch(html, /class="role-card"/);
    assert.doesNotMatch(html, /class="roles-section"/);
  } finally {
    search = "";
  }
});
