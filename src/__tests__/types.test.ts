import PropTypes from "prop-types";
import { expectTypeOf } from "expect-type";

import { configure } from "../astroglide";
import { createSelectorHook } from "../selectors";
import { useAction } from "../actions";
import { addPlugins } from "../plugins/service";
import setPlugin from "../plugins/set";
import typePlugin from "../plugins/type";
import persistPlugin, {
  getPersistedValue,
  storePersistedValue,
} from "../plugins/persist";

import type { HookReturn, SliceHook } from "../astroglide";

const [set, type, persist] = addPlugins(
  setPlugin(),
  typePlugin(),
  persistPlugin()
);

const { store, createSlice } = configure({});

const slice = createSlice("types/main", {
  username: type(PropTypes.string, ""),
  isOpen: type(PropTypes.bool, false),
  authInfo: persist(
    type(
      PropTypes.shape({
        id: PropTypes.number,
        token: PropTypes.string,
      })
    )
  ),
  clicks: set((value: number) => value + 1),
  plainCount: 0,
  plainFlag: false,
});

// NOTE: `.returns`/`.parameter(n)` from expect-type don't work on this repo's
// TypeScript 4.9 + non-strict config, so assertions use ReturnType/Parameters.

describe("plugin-wrapped slice specs carry value types", () => {
  it("resolves type(validator, defaultValue) fields to the runtime value type", () => {
    expectTypeOf(slice.hooks.useUsername).toEqualTypeOf<SliceHook<string>>();
    expectTypeOf(slice.hooks.useIsOpen).toEqualTypeOf<SliceHook<boolean>>();

    expect(slice.hooks.useUsername).toBeInstanceOf(Function);
    expect(slice.hooks.useIsOpen).toBeInstanceOf(Function);
  });

  it("carries the value type through chained plugins (persist(type(shape)))", () => {
    type AuthInfo = ReturnType<typeof slice.hooks.useAuthInfo.select>;

    expectTypeOf<AuthInfo>().toMatchTypeOf<
      { id?: number | null; token?: string | null } | null | undefined
    >();

    expect(slice.hooks.useAuthInfo).toBeInstanceOf(Function);
  });

  it("infers set() fields from the callback return type", () => {
    expectTypeOf(slice.hooks.useClicks).toEqualTypeOf<SliceHook<number>>();
  });

  it("leaves plain-value fields unchanged", () => {
    expectTypeOf(slice.hooks.usePlainCount).toEqualTypeOf<SliceHook<number>>();
    expectTypeOf(slice.hooks.usePlainFlag).toEqualTypeOf<SliceHook<boolean>>();

    expect(store.getState()["types/main"].plainCount).toBe(0);
  });

  it("types generated selectors and setter actions off the resolved state", () => {
    type SelectUsernameReturn = ReturnType<typeof slice.selectors.selectUsername>;
    type SelectIsOpenReturn = ReturnType<typeof slice.selectors.selectIsOpen>;
    type SetUsernamePayload = Parameters<typeof slice.actions.setUsername>[0];
    type SetIsOpenPayload = Parameters<typeof slice.actions.setIsOpen>[0];
    type Domain = ReturnType<typeof slice.hooks.useSlice.select>;

    expectTypeOf<SelectUsernameReturn>().toEqualTypeOf<string>();
    expectTypeOf<SelectIsOpenReturn>().toEqualTypeOf<boolean>();
    expectTypeOf<SetUsernamePayload>().toEqualTypeOf<string>();
    expectTypeOf<SetIsOpenPayload>().toEqualTypeOf<boolean>();

    expectTypeOf<Domain>().toMatchTypeOf<{
      username: string;
      isOpen: boolean;
      plainCount: number;
    }>();

    store.dispatch(slice.actions.setUsername("bob"));
    expect(slice.selectors.selectUsername(store.getState())).toBe("bob");
  });

  it("HookReturn mirrors the real field-hook return tuple [value, setter]", () => {
    type IsOpenValue = ReturnType<typeof slice.hooks.useIsOpen.select>;

    // HookReturn<T> must match the actual runtime return of a field hook: a
    // 2-tuple of [value, setter]. There is no third element at runtime.
    expectTypeOf<HookReturn<IsOpenValue>>().toEqualTypeOf<
      [boolean, (value: boolean | ((prev: boolean) => boolean)) => void]
    >();

    // ...and it agrees with SliceHook<T>'s call signature.
    expectTypeOf<HookReturn<IsOpenValue>>().toEqualTypeOf<
      ReturnType<typeof slice.hooks.useIsOpen>
    >();
  });

  it("keeps the RTK-config overload inference on the resolved state", () => {
    const counterSlice = createSlice(
      "types/counter",
      {
        value: type(PropTypes.number, 0),
      },
      {
        reducers: {
          increment: (state) => {
            expectTypeOf(state.value).toEqualTypeOf<number>();
            state.value += 1;
          },
        },
      }
    );

    expectTypeOf(counterSlice.hooks.useValue).toEqualTypeOf<SliceHook<number>>();

    store.dispatch(counterSlice.actions.increment());
    expect(store.getState()["types/counter"].value).toBe(1);
  });

  it("does not introduce hard errors for untyped/any specs", () => {
    const untypedSpec: any = {
      foo: (persist as any)("bar"),
    };

    const anySlice = createSlice("types/any", untypedSpec);

    expect(anySlice.hooks.useFoo).toBeInstanceOf(Function);
    expect((anySlice.selectors as any).selectFoo(store.getState())).toBe("bar");
  });

  it("infers createSelectorHook combiner params and result from input selectors", () => {
    const useLabel = createSelectorHook(
      slice.selectors.selectUsername,
      slice.selectors.selectIsOpen,
      (username, isOpen) => (isOpen ? username : "closed")
    );

    expectTypeOf<ReturnType<typeof useLabel>>().toEqualTypeOf<string>();
    expectTypeOf<ReturnType<typeof useLabel.select>>().toEqualTypeOf<string>();

    // the combiner's parameters come from the input selectors' return types
    const combiner = (username: string, isOpen: boolean) => ({ username, isOpen });
    const useCombined = createSelectorHook(
      slice.selectors.selectUsername,
      slice.selectors.selectIsOpen,
      combiner
    );
    expectTypeOf<ReturnType<typeof useCombined.select>>().toEqualTypeOf<{
      username: string;
      isOpen: boolean;
    }>();

    expect(useCombined.select(store.getState())).toEqual({
      username: "bob",
      isOpen: false,
    });
  });

  it("types useAction as the bound action creator", () => {
    // hooks only run in components; typecheck-only closure
    const actionCheck = () => {
      const bound = useAction(slice.actions.setUsername);
      expectTypeOf<Parameters<typeof bound>[0]>().toEqualTypeOf<string>();
    };

    expect(typeof actionCheck).toBe("function");
  });

  it("typechecks the acceptance snippet with zero casts", () => {
    const loginSlice = createSlice("containers/Login", {
      username: type(PropTypes.string, ""),
      password: type(PropTypes.string, ""),
    });

    // React hooks can only run inside components; this closure is never
    // executed — it exists so the destructured hook calls are typechecked.
    const acceptance = () => {
      const { useUsername, usePassword } = loginSlice.hooks;
      const [username, setUsername] = useUsername();
      const [password, setPassword] = usePassword();

      expectTypeOf(username).toEqualTypeOf<string>();
      expectTypeOf(setUsername).toEqualTypeOf<
        (value: string | ((prev: string) => string)) => void
      >();
      expectTypeOf(password).toEqualTypeOf<string>();
      expectTypeOf(setPassword).toEqualTypeOf<
        (value: string | ((prev: string) => string)) => void
      >();

      expectTypeOf(useUsername.select({} as any)).toEqualTypeOf<string>();
    };

    expect(typeof acceptance).toBe("function");

    // .select and .update are usable outside components with the same types
    const persisted: string = loginSlice.hooks.useUsername.select(store.getState());
    expect(typeof persisted).toBe("string");
    expect(loginSlice.hooks.usePassword.select(store.getState())).toBe("");
  });
});

describe("documented domain-level exports are typed", () => {
  it("exposes selectSlice as an alias of selectDomain over the resolved state", () => {
    // Runtime derives selectors from hooks by rewriting `use` -> `select`, so
    // the domain hook `useSlice` becomes `selectSlice` — an always-present
    // alias of `selectDomain`. Both must typecheck and point at the same fn.
    expect(slice.selectors.selectSlice).toBe(slice.selectors.selectDomain);

    type FromSlice = ReturnType<typeof slice.selectors.selectSlice>;
    type FromDomain = ReturnType<typeof slice.selectors.selectDomain>;

    expectTypeOf<FromSlice>().toEqualTypeOf<FromDomain>();
    expectTypeOf<FromSlice>().toMatchTypeOf<{
      username: string;
      isOpen: boolean;
      clicks: number;
      plainCount: number;
      plainFlag: boolean;
    }>();

    expect(slice.selectors.selectSlice(store.getState())).toBe(
      store.getState()["types/main"]
    );
  });

  it("types the useSlice domain hook's select/update against the resolved state", () => {
    expectTypeOf<
      ReturnType<typeof slice.hooks.useSlice.select>
    >().toEqualTypeOf<ReturnType<typeof slice.selectors.selectDomain>>();

    // update accepts a Partial of the resolved state, or a producer fn — both
    // must compile. Hooks only run in components; this closure is never called.
    const checkUpdate = () => {
      slice.hooks.useSlice.update({ username: "x" });
      slice.hooks.useSlice.update((prev) => ({ username: prev.username }));
    };
    expect(typeof checkUpdate).toBe("function");
  });

  it("types the setSlice action over a partial of the resolved state", () => {
    // setSlice accepts any Partial of the resolved state — both must compile.
    const checkSetSlice = () => {
      slice.actions.setSlice({ isOpen: true });
      slice.actions.setSlice({ username: "x", clicks: 3 });
    };
    expect(typeof checkSetSlice).toBe("function");

    store.dispatch(slice.actions.setSlice({ username: "domain-bob" }));
    expect(slice.selectors.selectUsername(store.getState())).toBe("domain-bob");
  });

  it("keeps inference on the RTK-compatible object-form createSlice", () => {
    const objSlice = createSlice({
      name: "types/object-form",
      initialState: {
        title: type(PropTypes.string, ""),
        active: type(PropTypes.bool, false),
      },
    });

    expectTypeOf(objSlice.hooks.useTitle).toEqualTypeOf<SliceHook<string>>();
    expectTypeOf(objSlice.hooks.useActive).toEqualTypeOf<SliceHook<boolean>>();
    expectTypeOf<ReturnType<typeof objSlice.selectors.selectTitle>>().toEqualTypeOf<
      string
    >();

    // object-form still surfaces the documented domain selector
    expect(typeof objSlice.selectors.selectSlice).toBe("function");
    expect(objSlice.selectors.selectTitle(store.getState())).toBe("");
  });
});

describe("persist plugin helper exports are typed", () => {
  it("getPersistedValue infers T and stays undefined-able", () => {
    const value = getPersistedValue<boolean>("isOpen", "types/main");
    expectTypeOf(value).toEqualTypeOf<boolean | undefined>();
  });

  it("storePersistedValue / getPersistedValue round-trip at runtime", () => {
    storePersistedValue("roundTrip", "types/main", 42);

    const back = getPersistedValue<number>("roundTrip", "types/main");
    expectTypeOf(back).toEqualTypeOf<number | undefined>();
    expect(back).toBe(42);
  });
});
