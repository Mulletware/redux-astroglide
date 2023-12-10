# Redux-Astroglide

#### Redux doesn't need to be such a pain the butt!

Redux-Astroglide is a set of configuration and automation tools built on top of Redux Toolkit in order to provide the most succinct API with the least boilerplate possible. It's the easiest way to get up and running with redux state, and has the lowest mental overhead of any state management tool for React.

We stay DRY so you don't have to.

&nbsp;

## Installation

```bash
# NPM
npm install @reduxjs/toolkit redux-astroglide
```

```bash
# Yarn
yarn add @reduxjs/toolkit redux-astroglide
```

```bash
# PNPM
pnpm add @reduxjs/toolkit redux-astroglide

```

If you're using React, you must also install `react-redux` as a dependency.

[@reduxjs/toolkit docs](https://github.com/reduxjs/redux-toolkit#installation)

## Setup

Astroglide will create your store for you using a call to RTK's configureStore function. This step allows Astroglide to manage all aspects of reducers including code bundle injection without intervention.

```jsx
// app/store.js
import configure from "redux-astroglide";

const { store, createSlice } = configure({
  // ... (configureStore options)
});
```

&nbsp;

[Learn more about RTK's configureStore function](https://redux-toolkit.js.org/usage/usage-with-typescript#configurestore)

Now just create a slice anywhere in your application and in addition to the actions created by Redux Toolkit you'll get some memoized selectors and hooks from Astroglide:

```jsx
import { createSlice } from "../../app/store";

const slice = createSlice(
  "LoginForm", // reducer namespace
  {
    // initial state
    username: "",
    password: "",
    count: 0,
  }
);

export const { setUsername, setPassword } = slice.actions;
export const { selectUsername, selectPassword } = slice.selectors;
export const { useUsername, usePassword } = slice.hooks;
```

&nbsp;

Alternatively, you can create the slice using [the same API specified by RTK](https://redux-toolkit.js.org/usage/usage-with-typescript#createslice).

```jsx
const slice = createSlice({
  name: "Login",
  initialState: {
    username: "",
    password: "",
    count: 0,
  },
  reducers: {
    // custom reducers are the most likely reason to use this syntax
  },
  // other RTK functionality can go here
});
```

&nbsp;

Now wrap your app (or the relevant portion for this redux store) in a Provider from react-redux if you're using React

```js
// App.js
import { Provider } from "react-redux";
import { store } from "../app/store";

export default () => (
  <Provider store={store}>{/* the rest of your app */}</Provider>
);
```

&nbsp;

## Usage

The generated hooks can be used in a React component with the same API as React's setState:

```jsx
export const UsernameField = (props) => {
  const [username, setUsername] = useUsername();

  return (
    <input
      name="username"
      type="text"
      value={username}
      onChange={
        (e) => setUsername(e.target.value) // dispatch a redux action named "LoginForm/setUsername"
      }
    />
  );
};
```

You can pass a function to the hook to assign a custom value setter for that instance of the hook:

```jsx
// component.js
function Component() {
  const [count, increment] = useCount((currentCount) => currentCount + 1);

  // ...
}
```

&nbsp;

The setter actions can be passed a function to receive a copy of the latest state value, just like with React's setState:

```jsx
<input
  //...
  onChange={(e) =>
    setUsername((currentUsername) =>
      isValid(e.target.value) ? e.target.value : currentUsername
    )
  }
/>
```

&nbsp;

Astroglide's createSlice exposes global domain selectors and setters, if you need something like that:

```jsx
const slice = createSlice(
  // ...
);

export { useSlice } = slice.hooks;
export { selectSlice } = slice.selectors;
export { setSlice } = slice.actions; // will not conflict with existing `slice` prop actions
```

&nbsp;

The hooks can also be used outside of a React component (like in a thunk or saga) by destructuring the `select` and `update` props. This allows your reducer file to export as few variables as possible:

```jsx
// thunk.js
import { createAsyncThunk } from "@reduxjs/toolkit";

import { useUsername, usePassword } from "./slice";
// OR
import {
  selectUsername,
  setUsername,
  selectPassword,
  setPassword,
} from "./slice";

const loginThunk = createAsyncThunk(
  "login",
  async (args, { dispatch, getState }) => {
    const username = useUsername.select(getState());
    const password = usePassword.select(getState());
    // logic ...
    dispatch(useUsername.update("newUsername"));
    // ...

    // OR

    const username = selectUsername(getState());
    const password = selectPassword(getState());
    // logic ...
    dispatch(setUsername("newUsername"));
    // ...
  }
);

// saga.js
import { select, put } from "redux-saga/effects";

import { useUsername, usePassword } from "./slice";
// OR
import {
  selectUsername,
  setUsername,
  selectPassword,
  setPassword,
} from "./slice";

function* loginSaga(action) {
  const username = yield select(useUsername.select);
  const password = yield select(usePassword.select);
  // logic ...
  yield put(useUsername.update("newUsername"));

  // OR

  const username = yield select(selectUsername);
  const password = yield select(selectPassword);
  // logic ...
  yield put(setUsername("newUsername"));
}
```

&nbsp;

Astroglide also provides some of its internal helper functions:

```jsx
const configure = "redux-astroglide";

export const {
  store,
  createSlice,

  injectReducer, // injectReducer(key: string, state => state: reducer fn, optionally async)
  injectSlice, // injectSlice(slice: result from createSlice())
  injectMiddleware, // injectMiddleware(middleware: redux middleware)
} = configure();
```

&nbsp;

## Plugins

Astroglide comes with plugins you can use for typechecking, data persistence and custom value and state setters:

```jsx
// Login/slice.js
const slice = createSlice("Login", {
  username: type(PropType.string, ""),
  password: type(PropTypes.string, "", { shouldPreventUpdate: true }),
});

// Nav/slice.js
const slice = createSlice("Nav", {
  token: persist("", {
    storageType: localStorage, // default localStorage, or API passed to setup fn, must provide { getItem(key):any, setItem(key, value):void } API (async not allowed)
  }),
  clickCount: set((value) => value + 1),
  instanceCount: set((value, { draft }) => {
    draft.clickCount = 0;
    return value + 1;
  }),
});
```

&nbsp;

These plugins are loaded by adding this to your Astroglide configuration:

```jsx
import configure, { addPlugins } from "redux-astroglide";

import setPlugin from "redux-astroglide/plugins/set";
import typePlugin from "redux-astroglide/plugins/type";
import persistPlugin from "redux-astroglide/plugins/persist";
// these can also be imported like:
// import { set, type, persist } = "redux-astroglide/plugins";

export const [set, type, persist] = addPlugins(
  setPlugin(),
  typePlugin({ shouldPreventUpdate: false }),
  persistPlugin({
    storageType: { // defaults to localStorage (async storage not allowed)
      getItem(key: string),
      setItem(key: string, value: string)}
    }
  )
);

export const { store, createSlice } = configure();
```

Plugins like persist also export their own tools:

```ts
import {
  getPersistedValue,
  storePersistedValue,
} from "redux-astroglide/plugins/persist";

const currentValue = getPersistedValue(
  "isOpen",
  "Nav"
  // storageType: localStorage | sessionStorage |
  // { getItem(key: string), setItem(key: string, value:string) }
);

storePersistedValue(
  "isOpen",
  "Nav",
  true
  // storageType: localStorage | sessionStorage { getItem, setItem }
);
```

&nbsp;

## Custom Plugins

If you the find the need to write your own custom plugins you can do so via the following API:

```jsx
import { addPlugin, addPlugins } from "redux-astroglide";
addPlugin({
  constructor(constructorArgs) {
    // here you can modify the running instance
  },
  setup(pluginInstance, { key, sliceConfig, }) {
    // here you can return an object with variable to access later
    return {};
  },
  getInitialValue(value, { key, plugin }) {
    return value
  }
  update(value, { draft, key, plugin }) {
    return value;
  },
})
// or
addPlugins({
  // plugin 1
}, {
  // plugin 2
})

```

&nbsp;

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

&nbsp;

## License

[MIT](https://choosealicense.com/licenses/mit/)
