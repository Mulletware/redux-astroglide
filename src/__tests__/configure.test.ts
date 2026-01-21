import { configure } from '../astroglide';

describe('configure', () => {
  it('should work with empty config object', () => {
    const { store, createSlice } = configure({});

    expect(store).toBeDefined();
    expect(store.getState()).toBeDefined();
    expect(createSlice).toBeInstanceOf(Function);
  });

  it('should work with devTools option', () => {
    const { store, createSlice } = configure({ devTools: false });

    expect(store).toBeDefined();
    expect(createSlice).toBeInstanceOf(Function);
  });

  it('should work when called with no arguments', () => {
    const { store, createSlice } = configure();

    expect(store).toBeDefined();
    expect(createSlice).toBeInstanceOf(Function);
  });

  it('should create slices that auto-register with the store', () => {
    const { store, createSlice } = configure({});

    const slice = createSlice('testSlice', {
      username: '',
      count: 0,
    });

    // Verify slice was created
    expect(slice.name).toBe('testSlice');
    expect(slice.hooks).toBeDefined();
    expect(slice.hooks.useUsername).toBeInstanceOf(Function);
    expect(slice.hooks.useCount).toBeInstanceOf(Function);
    expect(slice.selectors).toBeDefined();
    expect(slice.selectors.selectUsername).toBeInstanceOf(Function);
    expect(slice.selectors.selectCount).toBeInstanceOf(Function);
    expect(slice.actions).toBeDefined();
    expect(slice.actions.setUsername).toBeInstanceOf(Function);
    expect(slice.actions.setCount).toBeInstanceOf(Function);

    // Verify slice was injected into store
    const state = store.getState();
    expect(state.testSlice).toEqual({ username: '', count: 0 });
  });

  it('should support RTK-compatible object form', () => {
    const { store, createSlice } = configure({});

    const slice = createSlice({
      name: 'authSlice',
      initialState: { token: null, isLoggedIn: false }
    });

    expect(slice.name).toBe('authSlice');
    expect(slice.hooks.useToken).toBeInstanceOf(Function);
    expect(slice.hooks.useIsLoggedIn).toBeInstanceOf(Function);

    const state = store.getState();
    expect(state.authSlice).toEqual({ token: null, isLoggedIn: false });
  });

  it('should support custom reducers', () => {
    const { store, createSlice } = configure({});

    const slice = createSlice('counterSlice', {
      value: 0,
    }, {
      reducers: {
        increment: (state) => {
          state.value += 1;
        },
        decrement: (state) => {
          state.value -= 1;
        },
        incrementBy: (state, action: { payload: number }) => {
          state.value += action.payload;
        },
      }
    });

    expect(slice.actions.increment).toBeInstanceOf(Function);
    expect(slice.actions.decrement).toBeInstanceOf(Function);
    expect(slice.actions.incrementBy).toBeInstanceOf(Function);

    // Test that custom reducers work
    store.dispatch(slice.actions.increment());
    expect(store.getState().counterSlice.value).toBe(1);

    store.dispatch((slice.actions as any).incrementBy(5));
    expect(store.getState().counterSlice.value).toBe(6);

    store.dispatch(slice.actions.decrement());
    expect(store.getState().counterSlice.value).toBe(5);
  });

  it('should support multiple slices', () => {
    const { store, createSlice } = configure({});

    createSlice('user', { name: 'John', age: 30 });
    createSlice('settings', { theme: 'dark', lang: 'en' });

    const state = store.getState();
    expect(state.user).toEqual({ name: 'John', age: 30 });
    expect(state.settings).toEqual({ theme: 'dark', lang: 'en' });
  });
});
