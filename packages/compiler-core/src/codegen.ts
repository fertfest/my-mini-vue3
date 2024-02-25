import { isString } from "@my-mini-vue3/shared";
import { NodeTypes } from "./ast";
import {
  CREATE_ELEMENT_VNODE,
  TO_DISPLAY_STRING,
  helperNameMap,
} from "./runtimeHelper";
import { transform } from "./transform";

export function generate(ast) {
  const context = createGenerateContext(ast);
  const { push } = context;

  genFunctionPreamble(ast, context);

  push("return ");
  const args = ["_ctx", "_cache"];
  const functionName = "render";
  const signature = `${functionName}(${args.join(",")})`;

  push("function " + signature + "{ return ");

  transform(ast);
  genNode(ast.codegenNode, context);

  push(" }");

  return {
    code: context.code,
  };
}
function genFunctionPreamble(ast: any, context: any) {
  const { push } = context;
  if (ast.helpers.length > 0) {
    const VueBinging = "Vue\n";
    const aliasHelper = (s) => `${helperNameMap[s]}: _${helperNameMap[s]}`;
    push(
      `const { ${ast.helpers.map(aliasHelper).join(", ")} } = ${VueBinging}`
    );
  }
}

function genNode(node: any, context: any) {
  switch (node.type) {
    case NodeTypes.TEXT:
      genText(node, context);
      break;
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context);
      break;
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context);
      break;
    case NodeTypes.ELEMENT:
      genElement(node, context);
      break;
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node, context);
  }
}
function genText(node: any, context: any) {
  const { push } = context;
  push(`'${node.content}'`);
}

function genInterpolation(node: any, context: any) {
  const { push, helper } = context;
  push(`${helper(TO_DISPLAY_STRING)}(`);
  genNode(node.content, context);
  push(")");
}

function genExpression(node: any, context: any) {
  const { push } = context;
  push(`${node.content}`);
}

function genElement(node, context) {
  const { push, helper } = context;
  const { tag, children, props } = node;

  push(`${helper(CREATE_ELEMENT_VNODE)}(`);
  genNodeList(genNullable([tag, props, children]), context);
  // genNode(children, context);

  push(")");
}

function genNodeList(nodes: any[], context) {
  const { push } = context;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (isString(node)) {
      push(node);
    } else {
      genNode(node, context);
    }

    if (i !== nodes.length - 1) {
      push(", ");
    }
  }
}

function genNullable(args: any[]) {
  return args.map((arg) => arg || "null");
}

function createGenerateContext(ast: any) {
  const context = {
    code: "",
    push(str: string) {
      context.code += str;
    },
    helper(key) {
      return `_${helperNameMap[key]}`;
    },
  };

  return context;
}
function genCompoundExpression(node: any, context: any) {
  const { push } = context;
  for (const child of node.children) {
    if (isString(child)) {
      push(child);
    } else {
      genNode(child, context);
    }
  }
}
