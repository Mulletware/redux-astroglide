export default (callback: (value: any, { draft }) => any) => ({
  constructor(callback, value) {
    this.value = value;
    this.callback = callback;
  },
  update(value, { draft, plugin }) {
    return plugin.callback(value, { draft });
  },
});
