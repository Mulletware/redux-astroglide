import type {
  AstroglidePluginValue,
  PluginFactoryBrand,
  UnwrapPluginValue,
} from "../plugins";

type SetCallback = (value: any, context: { draft: any }) => any;

/** Spec container produced by the consumer-facing `set(...)` factory. Type-level only. */
export interface SetPluginValue<V> extends AstroglidePluginValue<V> {}

/**
 * Consumer-facing factory signature for the set plugin.
 * - `set(cb)` -> value type is the callback's return type.
 * - `set(cb, value)` -> value type comes from the wrapped value/plugin.
 */
export interface SetPluginFactory {
  <CB extends SetCallback>(callback: CB): SetPluginValue<ReturnType<CB>>;
  <CB extends SetCallback, T>(callback: CB, value: T): SetPluginValue<
    UnwrapPluginValue<T>
  >;
}

interface SetPlugin extends PluginFactoryBrand<SetPluginFactory> {
  value: any;
  callback: SetCallback;
  constructor(innerCallback: SetCallback | null, value: any): void;
  update(value: any, context: { draft: any; plugin: SetPlugin }): any;
}

export default (callback?: SetCallback): SetPlugin => ({
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
