type SetCallback = (value: any, context: { draft: any }) => any;

interface SetPlugin {
  value: any;
  callback: SetCallback;
  constructor(innerCallback: SetCallback | null, value: any): void;
  update(value: any, context: { draft: any; plugin: SetPlugin }): any;
}

export default (callback: SetCallback): SetPlugin => ({
  value: undefined as any,
  callback: callback,
  constructor(innerCallback: SetCallback | null, value: any) {
    this.value = value;
    this.callback = innerCallback || callback;
  },
  update(value: any, { draft, plugin }: { draft: any; plugin: SetPlugin }) {
    return plugin.callback(value, { draft });
  },
});
