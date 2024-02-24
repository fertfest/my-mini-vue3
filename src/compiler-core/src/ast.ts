import { CREATE_ELEMENT_VNODE } from "./runtimeHelper";

export const enum NodeTypes {
  INTERPOLATION,
  SIMPLE_EXPRESSION,
  ELEMENT,
  TEXT,
  ROOT,
  COMPOUND_EXPRESSION,
}

export const enum ElementTypes {
  ELEMENT,
}

export function createVNodeCall(context, tag, props, children) {
  const { addHelper } = context;
  addHelper(CREATE_ELEMENT_VNODE);
  return {
    type: NodeTypes.ELEMENT,
    tag,
    props,
    children,
  };
}
