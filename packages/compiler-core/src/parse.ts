import { ElementTypes, NodeTypes } from "./ast";

export function baseParse(content: string) {
  const context = createParserContext(content);
  return createRoot(parseChildren(context));
}

function parseChildren(context) {
  const nodes: any[] = [];

  while (context.source && context.source.length > 0) {
    const { source } = context;

    let node;
    if (source.startsWith("{{")) {
      node = parseInterpolation(context);
    } else if (source.startsWith("<")) {
      node = parseElement(context);
    } else {
      node = parseText(context);
    }

    nodes.push(node);
  }

  return nodes;
}

function parseInterpolation(context) {
  const openDelimiter = "{{";
  if (!context.source.startsWith(openDelimiter)) {
    throw new Error("parseInterpolation --- source doesn't start with {{!");
  }
  const closeDelimiter = "}}";

  advanceBy(context, openDelimiter.length);
  const closeIndex = context.source.indexOf(closeDelimiter);

  if (closeIndex === -1) {
    throw new Error("parseInterpolation --- source doesn't include }}!");
  }
  const value = parseTextData(context, closeIndex).trim();

  advanceBy(context, closeDelimiter.length);

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: value,
    },
  };
}

function advanceBy(context: any, length: number) {
  context.source = context.source.slice(length);
}

function createRoot(children: any[]) {
  return {
    children,
    type: NodeTypes.ROOT,
    helpers: [],
  };
}

function createParserContext(content: string) {
  return {
    source: content,
  };
}
function parseElement(context: any): any {
  const beginSign = "<";
  const endSign = ">";
  const selfClosedSign = "/";
  const openTagEndIndex = context.source.indexOf(endSign);
  const tagName = context.source.slice(beginSign.length, openTagEndIndex);
  advanceBy(context, openTagEndIndex + 1);

  // 自闭和标签
  if (tagName.startsWith(selfClosedSign)) {
    return {
      type: NodeTypes.ELEMENT,
      tag: tagName.slice(selfClosedSign.length),
      tagType: ElementTypes.ELEMENT,
      children: [],
    };
  }

  // 非自闭和标签
  const closeTag = `${beginSign}${selfClosedSign}${tagName}${endSign}`;
  const openTag = `${beginSign}${tagName}${endSign}`;
  let closeTagIndex = -1;
  let openTagIndex = -1;
  while (true) {
    closeTagIndex = context.source.indexOf(closeTag, closeTagIndex + 1);
    openTagIndex = context.source.indexOf(openTag, openTagEndIndex + 1);

    if (
      closeTagIndex !== -1 &&
      (openTagIndex === -1 || openTagIndex > closeTagIndex)
    ) {
      break;
    } else {
      openTagIndex = closeTagIndex = closeTagIndex + closeTag.length;
      if (openTagIndex >= context.source.length) {
        throw new Error(`缺失结束标签：${tagName}`);
      }
    }
  }

  const innerContent = context.source.slice(0, closeTagIndex);

  const innerContentContext = createParserContext(innerContent);

  advanceBy(context, closeTagIndex + closeTag.length);

  return {
    type: NodeTypes.ELEMENT,
    tag: tagName,
    tagType: ElementTypes.ELEMENT,
    children: parseChildren(innerContentContext),
  };
}
function parseText(context: any): any {
  let endIndex = context.source.length;
  const openInterpolationIndex = context.source.indexOf("{{");
  const closeInterpolationIndex = context.source.indexOf("}}");

  if (
    openInterpolationIndex !== -1 &&
    closeInterpolationIndex !== -1 &&
    openInterpolationIndex < closeInterpolationIndex
  ) {
    endIndex = openInterpolationIndex;
  }

  const content = parseTextData(context, endIndex);

  return {
    type: NodeTypes.TEXT,
    content: content,
  };
}
function parseTextData(context: any, length: number) {
  const text = context.source.slice(0, length);
  advanceBy(context, length);
  return text;
}
