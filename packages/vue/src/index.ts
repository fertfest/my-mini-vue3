export * from "@my-mini-vue3/runtime-dom";

import { baseCompile } from "@my-mini-vue3/compiler-core";
import * as runtimeDom from "@my-mini-vue3/runtime-dom";
import { registerRuntimeCompiler } from "@my-mini-vue3/runtime-dom";

function compileToFunction(template) {
  const { code } = baseCompile(template);
  const render = new Function("Vue", code)(runtimeDom);

  return render;
}

registerRuntimeCompiler(compileToFunction);
