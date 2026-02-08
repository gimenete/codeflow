# React Effect Anti-Patterns — Complete Reference

Detailed before/after examples for every scenario where an Effect can be removed or replaced with a simpler pattern.

---

## 1. Derived / Transformed Data

State that can be computed from other state or props should never live in its own `useState` + `useEffect` pair.

```tsx
// BAD — extra state, extra render
function Form() {
  const [firstName, setFirstName] = useState("Taylor");
  const [lastName, setLastName] = useState("Swift");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    setFullName(firstName + " " + lastName);
  }, [firstName, lastName]);
}

// GOOD — calculated during render
function Form() {
  const [firstName, setFirstName] = useState("Taylor");
  const [lastName, setLastName] = useState("Swift");
  const fullName = firstName + " " + lastName;
}
```

---

## 2. Expensive Calculations

When the derivation is expensive, wrap it in `useMemo` — not in state + Effect.

```tsx
// BAD
function TodoList({ todos, filter }) {
  const [visibleTodos, setVisibleTodos] = useState([]);
  useEffect(() => {
    setVisibleTodos(getFilteredTodos(todos, filter));
  }, [todos, filter]);
}

// GOOD
function TodoList({ todos, filter }) {
  const visibleTodos = useMemo(
    () => getFilteredTodos(todos, filter),
    [todos, filter],
  );
}
```

Note: React Compiler can automatically memoize many calculations, reducing the need for manual `useMemo`.

---

## 3. Resetting All State on Prop Change

Use `key` to tell React to mount a fresh instance when identity changes.

```tsx
// BAD — renders with stale state, then resets
export default function ProfilePage({ userId }) {
  const [comment, setComment] = useState("");
  useEffect(() => {
    setComment("");
  }, [userId]);
}

// GOOD — key forces remount
export default function ProfilePage({ userId }) {
  return <Profile userId={userId} key={userId} />;
}

function Profile({ userId }) {
  const [comment, setComment] = useState(""); // fresh on each userId
}
```

---

## 4. Partial State Adjustment on Prop Change

Store an ID instead of the full object so the value is always derivable.

```tsx
// BAD — Effect resets selection
function List({ items }) {
  const [selection, setSelection] = useState(null);
  useEffect(() => {
    setSelection(null);
  }, [items]);
}

// GOOD — derive selection from current items
function List({ items }) {
  const [selectedId, setSelectedId] = useState(null);
  const selection = items.find((item) => item.id === selectedId) ?? null;
}
```

If a previous-props pattern is truly needed (rare), adjust state during render:

```tsx
function List({ items }) {
  const [prevItems, setPrevItems] = useState(items);
  const [selection, setSelection] = useState(null);

  if (items !== prevItems) {
    setPrevItems(items);
    setSelection(null);
  }
}
```

---

## 5. User Event Logic

If something should happen **because the user clicked**, put it in the handler — not in an Effect triggered by state the handler set.

```tsx
// BAD — notification fires on page refresh if item is in cart
function ProductPage({ product, addToCart }) {
  useEffect(() => {
    if (product.isInCart) {
      showNotification(`Added ${product.name} to cart!`);
    }
  }, [product]);

  function handleBuyClick() {
    addToCart(product);
  }
}

// GOOD — notification only on actual user action
function ProductPage({ product, addToCart }) {
  function handleBuyClick() {
    addToCart(product);
    showNotification(`Added ${product.name} to cart!`);
  }
}
```

---

## 6. POST Requests on User Submission

Sending data in response to form submission belongs in the event handler. Only analytics that fire because the component displayed belong in Effects.

```tsx
// BAD
function Form() {
  const [jsonToSubmit, setJsonToSubmit] = useState(null);
  useEffect(() => {
    if (jsonToSubmit !== null) {
      post("/api/register", jsonToSubmit);
    }
  }, [jsonToSubmit]);

  function handleSubmit(e) {
    e.preventDefault();
    setJsonToSubmit({ firstName, lastName });
  }
}

// GOOD
function Form() {
  // Analytics — runs because component displayed (valid Effect)
  useEffect(() => {
    post("/analytics/event", { eventName: "visit_form" });
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    post("/api/register", { firstName, lastName });
  }
}
```

---

## 7. Chains of Effects

Multiple Effects triggering each other cascade re-renders.

```tsx
// BAD — chain: card → goldCardCount → round → isGameOver
useEffect(() => {
  if (card?.gold) setGoldCardCount((c) => c + 1);
}, [card]);
useEffect(() => {
  if (goldCardCount > 3) {
    setRound((r) => r + 1);
    setGoldCardCount(0);
  }
}, [goldCardCount]);
useEffect(() => {
  if (round > 5) setIsGameOver(true);
}, [round]);

// GOOD — all state transitions in the event handler
const isGameOver = round > 5;

function handlePlaceCard(nextCard) {
  if (isGameOver) throw Error("Game already ended.");
  setCard(nextCard);
  if (nextCard.gold) {
    if (goldCardCount < 3) {
      setGoldCardCount(goldCardCount + 1);
    } else {
      setGoldCardCount(0);
      setRound(round + 1);
      if (round === 5) alert("Good game!");
    }
  }
}
```

---

## 8. Notifying Parent Components

Calling `onChange` inside an Effect fires after render, causing cascading updates.

```tsx
// BAD
function Toggle({ onChange }) {
  const [isOn, setIsOn] = useState(false);
  useEffect(() => {
    onChange(isOn);
  }, [isOn, onChange]);

  function handleClick() {
    setIsOn(!isOn);
  }
}

// GOOD — update both in the same event
function Toggle({ onChange }) {
  const [isOn, setIsOn] = useState(false);

  function handleClick() {
    const nextIsOn = !isOn;
    setIsOn(nextIsOn);
    onChange(nextIsOn);
  }
}

// BEST — fully controlled
function Toggle({ isOn, onChange }) {
  function handleClick() {
    onChange(!isOn);
  }
}
```

---

## 9. Passing Data to Parent

Children should not fetch data then push it to parents via Effects. Lift the fetch to the parent and pass data down.

```tsx
// BAD
function Parent() {
  const [data, setData] = useState(null);
  return <Child onFetched={setData} />;
}
function Child({ onFetched }) {
  const data = useSomeAPI();
  useEffect(() => {
    if (data) onFetched(data);
  }, [data, onFetched]);
}

// GOOD — parent owns the data
function Parent() {
  const data = useSomeAPI();
  return <Child data={data} />;
}
```

---

## 10. Application Initialization

Top-level initialization in Effects runs twice in development (Strict Mode) and on every remount.

```tsx
// BAD
function App() {
  useEffect(() => {
    loadDataFromLocalStorage();
    checkAuthToken();
  }, []);
}

// GOOD — module-level guard
let didInit = false;
function App() {
  useEffect(() => {
    if (!didInit) {
      didInit = true;
      loadDataFromLocalStorage();
      checkAuthToken();
    }
  }, []);
}

// ALSO GOOD — run before render
if (typeof window !== "undefined") {
  checkAuthToken();
  loadDataFromLocalStorage();
}
```

---

## 11. Subscribing to External Stores

Prefer `useSyncExternalStore` over manual Effects with subscriptions.

```tsx
// BAD
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  return isOnline;
}

// GOOD
function subscribe(callback) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
```

---

## 12. Data Fetching (When an Effect IS Needed)

When fetching data in an Effect, always handle race conditions with a cleanup flag.

```tsx
function SearchResults({ query }) {
  const [results, setResults] = useState([]);

  useEffect(() => {
    let ignore = false;

    fetchResults(query).then((json) => {
      if (!ignore) setResults(json);
    });

    return () => {
      ignore = true;
    };
  }, [query]);
}
```

Better: extract into a custom hook or use a library (TanStack Query, SWR) that handles caching, deduplication, and race conditions.

```tsx
function SearchResults({ query }) {
  const results = useData(`/api/search?query=${query}`);
}
```
