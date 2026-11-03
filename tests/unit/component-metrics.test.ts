import { describe, expect, it } from "vitest";
import { runComponentFixture } from "./component-check-fixture";
function check(code: string) {
  return runComponentFixture({ "Sample.tsx": code }).output;
}
describe("component decomposition signals", () => {
  it.each([10, 11])("counts %i typed Props", (count) => {
    const fields = Array.from({ length: count }, (_, i) => `p${i}:string`).join(
      ";",
    );
    const output = check(
      `interface Props{${fields}} export function Sample(props:Props){return <div/>}`,
    );
    expect(output.includes(`Props=${count}>10`)).toBe(count > 10);
  });
  it.each([2, 3])("counts %i useEffect", (count) => {
    const output = check(
      `export function Sample(){${"useEffect(()=>{},[]);".repeat(count)}return <div/>}`,
    );
    expect(output.includes(`useEffect=${count}>=3`)).toBe(count >= 3);
  });
  it.each([5, 6])("counts %i useState", (count) => {
    const output = check(
      `export function Sample(){${"useState(0);".repeat(count)}return <div/>}`,
    );
    expect(output.includes(`useState=${count}>=6`)).toBe(count >= 6);
  });
  it.each([3, 4])("counts JSX depth %i", (depth) => {
    const output = check(
      `export function Sample(){return ${"<div>".repeat(depth)}text${"</div>".repeat(depth)}}`,
    );
    expect(output.includes(`JSX depth=${depth}>3`)).toBe(depth > 3);
  });
  it.each([10, 11])("counts complexity %i", (complexity) => {
    const output = check(
      `export function Sample(){${"if (test) value++;".repeat(complexity - 1)}return <div/>}`,
    );
    expect(output.includes(`complexity=${complexity}>10`)).toBe(
      complexity > 10,
    );
  });
  it.each([2, 3])("detects %i forwarding edges across aliases", (edges) => {
    const code = Array.from(
      { length: edges + 1 },
      (_, i) =>
        `export function C${i}({value}:{value:string}){return ${i < edges ? `<C${i + 1} value={value}/>` : "<p>{value}</p>"}}`,
    ).join("\n");
    const output = check(code);
    expect(output.includes("prop forwarding >=3 levels")).toBe(edges >= 3);
  });
  it("resolves imported component aliases in forwarding chains", () => {
    const output = runComponentFixture({
      "A.tsx": `import { B as Nested } from './B';export function A({value}:{value:string}){return <Nested value={value}/>}`,
      "B.tsx": `import { C } from './C';export function B({value}:{value:string}){return <C value={value}/>}`,
      "C.tsx": `export function C({value}:{value:string}){return <D value={value}/>} function D({value}:{value:string}){return <p>{value}</p>}`,
    }).output;
    expect(output).toContain("prop forwarding >=3 levels");
  });
  it("flags a repeated nontrivial JSX block", () => {
    const block = `<section>${Array.from({ length: 12 }, (_, i) => `<p>row${i}</p>`).join("")}</section>`;
    expect(
      check(
        `export function One(){return ${block}} export function Two(){return ${block}}`,
      ),
    ).toContain("REUSE >=2");
  });
  it("does not force extraction of tiny repeats", () => {
    expect(
      check(
        "export function One(){return <p>hello</p>} export function Two(){return <p>hello</p>}",
      ),
    ).not.toContain("REUSE >=2");
  });
});

describe("alias and forwarding coverage", () => {
  it("counts aliased React hooks", () => {
    const output = runComponentFixture({
      "hooks.ts":
        "export function useEffect(callback: () => void, deps: unknown[]) {}",
      "Sample.tsx":
        "import { useEffect as effect } from './hooks';export function Sample(){effect(()=>{},[]);effect(()=>{},[]);effect(()=>{},[]);return <p/>}",
    }).output;
    expect(output).toContain("useEffect=3>=3");
  });
  it("counts direct spread forwarding", () => {
    const output = check(
      "type Props={value:string};function A(props:Props){return <B {...props}/>}function B(props:Props){return <C {...props}/>}function C(props:Props){return <D {...props}/>}function D(props:Props){return <p>{props.value}</p>}",
    );
    expect(output).toContain("prop forwarding >=3 levels");
  });
});
