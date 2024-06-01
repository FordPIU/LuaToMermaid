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
        const conditionNode = createNode(`if ${node.clauses[0].condition.raw}`);
        currentNodeId = conditionNode;
        if (parentNodeId) {
          edges.push({ from: parentNodeId, to: currentNodeId });
        }
        node.clauses.forEach((clause, index) => {
          const clauseNodeId = traverseNode(clause.body, conditionNode);
          if (index > 0) {
            edges.push({
              from: conditionNode,
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
      case "ForNumericStatement":
        const forNode = createNode(`for ${node.variable.name}`);
        currentNodeId = forNode;
        if (parentNodeId) {
          edges.push({ from: parentNodeId, to: currentNodeId });
        }
        traverseNode(node.body, forNode);
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

  let mermaidCode = "```mermaid\n";
  mermaidCode += "graph TD;\n";
  nodes.forEach((node) => {
    mermaidCode += `  ${node.id}[${node.label}];\n`;
  });
  edges.forEach((edge) => {
    mermaidCode += `  ${edge.from}-->${edge.to};\n`;
  });
  mermaidCode += "```";

  return mermaidCode;
}

function main() {
  const inputFilePath = process.argv[2];
  const outputFilePath = "output.mermaid.md";

  if (!inputFilePath) {
    console.error("Please provide a Lua file path as an argument.");
    process.exit(1);
  }

  const ast = parseLuaFile(inputFilePath);
  const mermaidCode = generateMermaid(ast);

  fs.writeFileSync(outputFilePath, mermaidCode);
  console.log(`Mermaid diagram saved to ${outputFilePath}`);
}

main();
