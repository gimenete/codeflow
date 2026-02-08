---
name: react-effects
description: This skill should be used when writing or reviewing React code that uses "useEffect", when the user asks to "remove unnecessary effects", "fix useEffect", "optimize re-renders", "refactor effects", or when adding state management logic that could be derived, computed, or handled in event handlers instead of effects.
version: 0.1.0
---

# You Might Not Need an Effect

Effects are an escape hatch from the React paradigm. They let components synchronize with **external systems** (network, browser DOM, third-party widgets, non-React code). If no external system is involved, removing the Effect typically simplifies the code and eliminates bugs.

## Core Decision Tree

Before writing a `useEffect`, apply this checklist in order:

1. **Can this be calculated during rendering?** Compute it directly in the component body or with `useMemo`.
2. **Is this in response to a user event?** Put the logic in the event handler, not an Effect.
3. **Does state need to reset when a prop changes?** Use a `key` on the component or compute derived values.
4. **Is this a chain of state updates?** Consolidate into one event handler.
5. **Is this notifying a parent or passing data upward?** Lift the state or call the parent callback from the event handler.
6. **Is this app initialization that should run once?** Use a module-level guard or run before rendering.
7. **Is this synchronizing with an external system?** This is a valid Effect. Include proper cleanup.

## Anti-Patterns to Eliminate

### Derived State in Effects

Never store computed values in state and sync them with an Effect. Calculate during render.

```tsx
// BAD
const [fullName, setFullName] = useState("");
useEffect(() => {
  setFullName(firstName + " " + lastName);
}, [firstName, lastName]);

// GOOD
const fullName = firstName + " " + lastName;
```

For expensive computations, use `useMemo` instead of state + Effect.

### User Event Logic in Effects

Logic that runs because a user did something belongs in the event handler — not in an Effect triggered by state the handler set.

```tsx
// BAD: shows notification on page load if item already in cart
useEffect(() => {
  if (product.isInCart) showNotification("Added!");
}, [product]);

// GOOD: shows notification only when user clicks buy
function handleBuyClick() {
  addToCart(product);
  showNotification("Added!");
}
```

### State Reset via Effects

Resetting state when props change causes a wasted render with stale values.

```tsx
// BAD: renders once with stale comment, then resets
useEffect(() => {
  setComment("");
}, [userId]);

// GOOD: key forces fresh component instance
<Profile userId={userId} key={userId} />;
```

### Effect Chains

Multiple Effects triggering each other in sequence cause cascading re-renders. Consolidate the logic into the originating event handler.

### Notifying Parent Components

Calling `onChange` props inside Effects fires after render, causing cascading updates. Call parent callbacks directly in event handlers or make the component fully controlled.

## When Effects ARE Appropriate

- Synchronizing with external systems (third-party widgets, browser APIs)
- Setting up subscriptions (`useSyncExternalStore` preferred for store subscriptions)
- Fetching data (with `ignore` flag for cleanup to prevent race conditions)
- Analytics/logging that should fire because the component was **displayed** (not because of a user action)

## Key Principles

1. **Data flows down, events flow up.** Never use Effects to push data to parents.
2. **Calculate, don't store.** Derived values in state cause unnecessary re-renders and sync bugs.
3. **One Effect = one external synchronization.** Avoid chains of Effects that trigger each other.
4. **Effects run because the component displayed, not because of interactions.** Event handlers handle interactions.

## Additional Resources

### Reference Files

For detailed patterns with complete before/after code examples covering all scenarios:

- **`references/patterns.md`** — Comprehensive anti-pattern catalog with fixes for: derived state, expensive computations, state reset on prop change, event handling, POST requests, Effect chains, parent notification, data passing, app initialization, external subscriptions, and data fetching.
