import ts from "typescript";

export function findComponents(source) {
  const found = [];
  function visit(node) {
    const variable = ts.isVariableDeclaration(node);
    let fn = ts.isFunctionDeclaration(node)
      ? node
      : variable
        ? node.initializer
        : undefined;
    if (
      fn &&
      ts.isCallExpression(fn) &&
      /(?:memo|forwardRef)$/.test(fn.expression.getText(source))
    ) {
      fn = fn.arguments.find(
        (arg) => ts.isArrowFunction(arg) || ts.isFunctionExpression(arg),
      );
    }
    if (
      node.name &&
      fn &&
      (ts.isFunctionDeclaration(fn) ||
        ts.isArrowFunction(fn) ||
        ts.isFunctionExpression(fn))
    ) {
      const name = node.name.getText(source);
      if (/^[A-Z]|^use[A-Z]/.test(name)) found.push({ name, node, fn });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return found;
}

export function analyzeComponent(component, source, checker) {
  const { fn } = component;
  let effects = 0,
    states = 0,
    complexity = 1,
    jsxDepth = 0;
  const forwarded = [];
  const parameter = fn.parameters[0];
  const props = parameter
    ? checker.getTypeAtLocation(parameter).getProperties().length
    : 0;
  const propNames = new Map();
  if (parameter && ts.isObjectBindingPattern(parameter.name)) {
    for (const e of parameter.name.elements) {
      if (!e.dotDotDotToken)
        propNames.set(
          e.name.getText(source),
          (e.propertyName ?? e.name).getText(source),
        );
    }
  }
  function inputProp(expr) {
    if (ts.isIdentifier(expr)) return propNames.get(expr.text);
    if (
      parameter &&
      ts.isIdentifier(parameter.name) &&
      ts.isPropertyAccessExpression(expr) &&
      expr.expression.getText(source) === parameter.name.text
    )
      return expr.name.text;
    return undefined;
  }
  function visit(node, depth = 0) {
    // Nested callbacks are included: hook use is counted even in invalid placement.
    if (ts.isCallExpression(node)) {
      let callee = node.expression.getText(source).split(".").at(-1);
      let symbol = checker.getSymbolAtLocation(node.expression);
      if (symbol && symbol.flags & ts.SymbolFlags.Alias)
        symbol = checker.getAliasedSymbol(symbol);
      if (symbol && ["useEffect", "useState"].includes(symbol.getName()))
        callee = symbol.getName();
      if (callee === "useEffect") effects++;
      if (callee === "useState") states++;
    }
    if (
      ts.isIfStatement(node) ||
      ts.isConditionalExpression(node) ||
      ts.isForStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isForOfStatement(node) ||
      ts.isWhileStatement(node) ||
      ts.isDoStatement(node) ||
      ts.isCaseClause(node) ||
      ts.isCatchClause(node)
    )
      complexity++;
    if (
      ts.isBinaryExpression(node) &&
      [
        ts.SyntaxKind.AmpersandAmpersandToken,
        ts.SyntaxKind.BarBarToken,
        ts.SyntaxKind.QuestionQuestionToken,
      ].includes(node.operatorToken.kind)
    )
      complexity++;
    const jsx =
      ts.isJsxElement(node) ||
      ts.isJsxSelfClosingElement(node) ||
      ts.isJsxFragment(node);
    const nextDepth = depth + (jsx ? 1 : 0);
    jsxDepth = Math.max(jsxDepth, nextDepth);
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(source);
      let targetSymbol = checker.getSymbolAtLocation(node.tagName);
      if (targetSymbol && targetSymbol.flags & ts.SymbolFlags.Alias)
        targetSymbol = checker.getAliasedSymbol(targetSymbol);
      for (const attr of node.attributes.properties) {
        if (
          ts.isJsxSpreadAttribute(attr) &&
          parameter &&
          ts.isIdentifier(parameter.name) &&
          attr.expression.getText(source) === parameter.name.text
        ) {
          forwarded.push({
            input: "*",
            target: tag,
            targetSymbol,
            output: "*",
          });
        }
        if (
          ts.isJsxAttribute(attr) &&
          attr.initializer &&
          ts.isJsxExpression(attr.initializer) &&
          attr.initializer.expression
        ) {
          const input = inputProp(attr.initializer.expression);
          if (input)
            forwarded.push({
              input,
              target: tag,
              targetSymbol,
              output: attr.name.getText(source),
            });
        }
      }
    }
    ts.forEachChild(node, (child) => visit(child, nextDepth));
  }
  if (fn.body) visit(fn.body);
  return { props, effects, states, complexity, jsxDepth, forwarded };
}

export function candidateReasons(metrics) {
  const reasons = [];
  if (metrics.props > 10) reasons.push(`Props=${metrics.props}>10`);
  if (metrics.effects >= 3) reasons.push(`useEffect=${metrics.effects}>=3`);
  if (metrics.states >= 6) reasons.push(`useState=${metrics.states}>=6`);
  if (metrics.jsxDepth > 3) reasons.push(`JSX depth=${metrics.jsxDepth}>3`);
  if (metrics.complexity > 10)
    reasons.push(`complexity=${metrics.complexity}>10`);
  return reasons;
}

export function findPropDrilling(components) {
  const byName = new Map();
  for (const c of components) {
    const entries = byName.get(c.name) ?? [];
    entries.push(c);
    byName.set(c.name, entries);
  }
  const bySymbol = new Map(
    components.filter((c) => c.symbol).map((c) => [c.symbol, c]),
  );
  const chains = new Set();
  function follow(component, incoming, chain, visited) {
    if (chain.length >= 4) {
      chains.add(chain.join(" -> "));
      return;
    }
    for (const edge of component.metrics.forwarded) {
      if (
        incoming &&
        incoming !== "*" &&
        edge.input !== "*" &&
        edge.input !== incoming
      )
        continue;
      // Ambiguous names cannot be safely resolved here; require manual review.
      const resolved = bySymbol.get(edge.targetSymbol);
      const targets = resolved ? [resolved] : (byName.get(edge.target) ?? []);
      if (targets.length !== 1) continue;
      const target = targets[0];
      if (visited.has(target.scope)) continue;
      follow(
        target,
        edge.output,
        [...chain, target.scope],
        new Set([...visited, target.scope]),
      );
    }
  }
  for (const c of components)
    follow(c, undefined, [c.scope], new Set([c.scope]));
  return [...chains];
}

export function findExactDuplicates(sources) {
  const groups = new Map();
  const printer = ts.createPrinter({ removeComments: true });
  for (const source of sources) {
    function visit(node) {
      const logicBody =
        ts.isBlock(node) &&
        (ts.isFunctionDeclaration(node.parent) ||
          ts.isArrowFunction(node.parent) ||
          ts.isFunctionExpression(node.parent));
      if (ts.isJsxElement(node) || ts.isJsxFragment(node) || logicBody) {
        const lines = node.getText(source).split("\n").length;
        // Do not force extraction when the resulting child would be <10 lines.
        if (lines >= 10) {
          const text = printer.printNode(ts.EmitHint.Unspecified, node, source);
          const entries = groups.get(text) ?? [];
          entries.push(
            `${source.fileName}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`,
          );
          groups.set(text, entries);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return [...groups.values()].filter((group) => group.length >= 2);
}
