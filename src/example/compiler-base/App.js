// 最简单的情况
// template 只有一个 interpolation
// export default {
//   template: `{{msg}}`,
//   setup() {
//     return {
//       msg: "vue3 - compiler",
//     };
//   },
// };
import { ref } from '../../../lib/guide-mini-vue.esm.js'


// 复杂一点
// template 包含 element 和 interpolation 
export default {
  name: 'App',
  template: `<div>hi, {{count}}</div>`,
  setup() {
    const count = ref(1);
    window.count = count;
    return {
      count,
    };
  },
};
