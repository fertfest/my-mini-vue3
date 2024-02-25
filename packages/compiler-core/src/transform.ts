import { NodeTypes } from "./ast";
import { TO_DISPLAY_STRING } from "./runtimeHelper";

export function transform(root, options = {}) {
  const context = createTransformContext(root, options);
  traverseNode(root, context);
  createRootCodegen(root);
  root.helpers = [...context.helpers];
}

function createTransformContext(root, options) {
  const context = {
    root,
    nodeTransforms: options.nodeTransforms ?? [],
    helpers: new Set(),
    addHelper(newHelper) {
      context.helpers.add(newHelper);
    },
  };

  return context;
}
function traverseNode(node: any, context: any) {
  const { nodeTransforms, addHelper } = context;
  const exitFns: any[] = [];
  for (const t of nodeTransforms) {
    const onExit = t(node, context);
    if (onExit) exitFns.push(onExit);
  }

  switch (node.type) {
    case NodeTypes.INTERPOLATION:
      addHelper(TO_DISPLAY_STRING);
      break;
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT:
      traverseChildren(node, context);
      break;
  }

  for (const fn of [...exitFns].reverse()) {
    fn();
  }
}
function traverseChildren(node: any, context: any) {
  const children = node.children;
  if (children) {
    for (const child of children) {
      traverseNode(child, context);
    }
  }
}
function createRootCodegen(root: any) {
  const child = root.children[0];
  if (child.type === NodeTypes.ELEMENT) {
    root.codegenNode = child.codegenNode;
  } else {
    root.codegenNode = child;
  }
}
