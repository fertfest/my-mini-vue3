import { h } from '../../../lib/guide-mini-vue.esm.js'

export const Child = {
  name: "Child",
  setup(props) {
    const count = props.count;
    return {
      count
    }
  },
  render() {
    return h(
      "div",
      undefined,
      this.count + ""
    )
  },
}
