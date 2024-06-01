const fs = require("fs");
const luaparse = require("luaparse");

function parseLuaFile(filePath) {
  const luaCode = fs.readFileSync(filePath, "utf8");
  return luaparse.parse(luaCode);
}

function sanitizeLabel(label) {
  return label.replace(/[^a-zA-Z0-9_ ]/g, "_");
}

function generateMermaid(ast) {
  let nodes = [];
  let edges = [];
  let nodeId = 0;

  function createNode(label) {
    const id = `node${nodeId++}`;
    nodes.push({ id, label: sanitizeLabel(label) });
    return id;
  }

  function traverseNode(node, parentNodeId = null) {
    let currentNodeId = null;

    switch (node.type) {
      case "Chunk":
        node.body.forEach((statement) => traverseNode(statement, parentNodeId));
        break;
      case "IfStatement":
        const ifConditionNode = createNode(
          `if ${node.clauses[0].condition.raw}`
        );
        currentNodeId = ifConditionNode;
        if (parentNodeId) {
          edges.push({ from: parentNodeId, to: currentNodeId });
        }
        node.clauses.forEach((clause, index) => {
          const clauseNodeId = traverseNode(clause.body, ifConditionNode);
          if (index > 0) {
            edges.push({
              from: ifConditionNode,
              to: clauseNodeId,
              condition: index === 1 ? "No" : "Else",
            });
          }
        });
        break;
      case "WhileStatement":
        const whileNode = createNode(`while ${node.condition.raw}`);
        currentNodeId = whileNode;
        if (parentNodeId) {
          edges.push({ from: parentNodeId, to: currentNodeId });
        }
        traverseNode(node.body, whileNode);
        break;
      case "RepeatStatement":
        const repeatNode = createNode("repeat");
        currentNodeId = repeatNode;
        if (parentNodeId) {
          edges.push({ from: parentNodeId, to: currentNodeId });
        }
        traverseNode(node.body, repeatNode);
        const untilNode = createNode(`until ${node.condition.raw}`);
        edges.push({ from: repeatNode, to: untilNode });
        break;
      case "ForNumericStatement":
        const forNumericNode = createNode(
          `for ${node.variable.name} = ${node.start.raw}, ${node.end.raw}${
            node.step ? `, ${node.step.raw}` : ""
          }`
        );
        currentNodeId = forNumericNode;
        if (parentNodeId) {
          edges.push({ from: parentNodeId, to: currentNodeId });
        }
        traverseNode(node.body, forNumericNode);
        break;
      case "ForGenericStatement":
        const forGenericNode = createNode(
          `for ${node.variables
            .map((v) => v.name)
            .join(", ")} in ${node.iterators.map((i) => i.raw).join(", ")}`
        );
        currentNodeId = forGenericNode;
        if (parentNodeId) {
          edges.push({ from: parentNodeId, to: currentNodeId });
        }
        traverseNode(node.body, forGenericNode);
        break;
      case "FunctionDeclaration":
        const args = node.parameters.map((param) => param.name).join(", ");
        const funcNode = createNode(
          `function ${node.identifier.name}(${args})`
        );
        currentNodeId = funcNode;
        if (parentNodeId) {
          edges.push({ from: parentNodeId, to: currentNodeId });
        }
        traverseNode(node.body, funcNode);
        break;
      case "ReturnStatement":
        const returnNode = createNode(
          `return ${node.arguments.map((arg) => arg.raw).join(", ")}`
        );
        currentNodeId = returnNode;
        if (parentNodeId) {
          edges.push({ from: parentNodeId, to: currentNodeId });
        }
        break;
      case "CallStatement":
        const callNode = createNode(
          `call ${node.expression.base.name}(${node.expression.arguments
            .map((arg) => arg.raw)
            .join(", ")})`
        );
        currentNodeId = callNode;
        if (parentNodeId) {
          edges.push({ from: parentNodeId, to: currentNodeId });
        }
        break;
      case "AssignmentStatement":
        const assignNode = createNode(
          `${node.variables.map((v) => v.name).join(", ")} = ${node.init
            .map((i) => i.raw)
            .join(", ")}`
        );
        currentNodeId = assignNode;
        if (parentNodeId) {
          edges.push({ from: parentNodeId, to: currentNodeId });
        }
        break;
      case "TableConstructorExpression":
        const tableNode = createNode(
          `table { ${node.fields
            .map((field) => `${field.key.raw} = ${field.value.raw}`)
            .join(", ")} }`
        );
        currentNodeId = tableNode;
        if (parentNodeId) {
          edges.push({ from: parentNodeId, to: currentNodeId });
        }
        break;
      case "LocalStatement":
        const localNode = createNode(
          `local ${node.variables.map((v) => v.name).join(", ")} = ${node.init
            .map((i) => i.raw)
            .join(", ")}`
        );
        currentNodeId = localNode;
        if (parentNodeId) {
          edges.push({ from: parentNodeId, to: currentNodeId });
        }
        break;
      case "RepeatStatement":
        const repeatConditionNode = createNode(`until ${node.condition.raw}`);
        currentNodeId = repeatConditionNode;
        if (parentNodeId) {
          edges.push({ from: parentNodeId, to: currentNodeId });
        }
        traverseNode(node.body, repeatConditionNode);
        break;
      default:
        if (Array.isArray(node)) {
          node.forEach((childNode) => traverseNode(childNode, parentNodeId));
        } else {
          const defaultNode = createNode(node.type);
          currentNodeId = defaultNode;
          if (parentNodeId) {
            edges.push({ from: parentNodeId, to: currentNodeId });
          }
        }
    }

    return currentNodeId;
  }

  traverseNode(ast);

  let mermaidCode = "graph TD;\n";
  nodes.forEach((node) => {
    mermaidCode += `  ${node.id}[${node.label}];\n`;
  });
  edges.forEach((edge) => {
    mermaidCode += `  ${edge.from}-->${edge.to};\n`;
  });

  return mermaidCode;
}

function main() {
  const inputFilePath = process.argv[2];
  const outputFilePath = "output.mermaid";

  if (!inputFilePath) {
    console.error("Please provide a Lua file path as an argument.");
    process.exit(1);
  }

  const ast = parseLuaFile(inputFilePath);
  const mermaidCode = generateMermaid(ast);

  fs.writeFileSync(outputFilePath, mermaidCode);
  fs.writeFileSync(
    outputFilePath + ".md",
    "```mermaid\n" + mermaidCode + "\n```"
  );
  console.log(`Mermaid diagram saved to ${outputFilePath}`);
}

main();
