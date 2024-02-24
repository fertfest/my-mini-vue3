import { generate } from "../src/codegen";
import { baseParse } from "../src/parse";
import { transform } from "../src/transform";
import { transformElement } from "../src/transforms/transformElement";
import { transformExpression } from "../src/transforms/transformExpression";
import { transformText } from "../src/transforms/transformText";

// test("codegen", () => {
//   const ast = baseParse("hi 1");

//   const { code } = generate(ast);

//   expect(code).toMatchSnapshot();
// });

// test("interpolation", () => {
//   const ast = baseParse("{{message}}");
//   console.log("ast", ast);

//   transform(ast, {
//     nodeTransforms: [transformExpression],
//   });
//   const { code } = generate(ast);
//   expect(code).toMatchSnapshot();
// });

// test("interpolation module", () => {
//   const ast = baseParse("{{hello}}");
//   transform(ast, {
//     nodeTransforms: [transformExpression],
//   });

//   const { code } = generate(ast);
//   expect(code).toMatchSnapshot();
// });

test("element", () => {
  const ast: any = baseParse("<div>hi, {{message}}</div>");
  transform(ast, {
    nodeTransforms: [transformExpression, transformElement, transformText],
  });

  const { code } = generate(ast);
  expect(code).toMatchSnapshot();
});

// test("element and interpolation", () => {
//   const ast = baseParse("<div>hi,{{msg}}</div>");
//   transform(ast, {
//     nodeTransforms: [transformElement, transformText, transformExpression],
//   });

//   const { code } = generate(ast);
//   expect(code).toMatchSnapshot();
// });
