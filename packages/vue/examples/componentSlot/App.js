import { h } from "../../../lib/guide-mini-vue.esm.js";
import Child from "./Child.js";

export default {
  name: "App",
  render() {
    const app = h("div", {}, "App");
    const foo = h(Child, {}, {
      header: ({ age }) => h("p", {}, "123" + age),
      footer: () => h("h1", {}, "hhh")
    });

    return h("div", {}, [app, foo]);
  },

  setup() {
    return {};
  },
};
