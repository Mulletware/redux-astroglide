import type { Draft } from "@reduxjs/toolkit";

export type sliceConfig = {
  name: string;
  initialState: object;
};

export type setupConfig = {
  key: string;
  sliceConfig: sliceConfig;
};

export type setup = (item: any, { key, sliceConfig }: setupConfig) => any;

export type getInitialValueConfig = {
  sliceConfig: sliceConfig;
  key: string;
  plugin?: any;
  config: object;
};

export type getInitialValue = (
  value: any,
  { sliceConfig, key, plugin }: getInitialValueConfig
) => any;

export type updateConfig = {
  key: string;
  sliceConfig: sliceConfig;
  plugin: any;
  draft: Draft<(...args: any[]) => any>;
};

export type update = (value: any, { key, sliceConfig }: updateConfig) => any;

export type PluginConfig = {
  setup?: setup;
  getInitialValue?: getInitialValue;
  update?: update;
  constructor?: Function | ((value: any) => void) | any;
  config?: object;
};

export type PluginClass = {
  value: any; // either the initial state value or the next plugin
  config: object;

  setValue(value: any): void;
  setConfig: (config: object) => void;

  setup(item: PluginClass, {}): any;
  getInitialValue(value: any, {}): any;
  update(value: any, {}): any;
};
