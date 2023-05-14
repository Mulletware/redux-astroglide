export default (callback: (value: any, { draft }) => any) => ({
  constructor(innerCallback, value) {
    this.value = value;
    this.callback = innerCallback || callback;
  },
  update(value, { draft, plugin }) {
    return plugin.callback(value, { draft });
  },
});
