# Frontend Development Standards & Vision

## 1. Core Vision
- **Responsive First**: Every feature must feel native on both Mobile (320px+) and Desktop (1440px+).
- **Thematic Consistency**: Full support for Light and Dark modes using CSS variables. No hardcoded colors.
- **Decoupled Architecture**: UI (Presentational) should be pure and logic-free. Logic (State/Data) resides in custom hooks or TanStack loaders.
- **Maintainability**: Code must be self-documenting, type-safe, and follow established patterns to minimize cognitive load for both humans and AIs.

---

## 2. Decoupling UI & Logic (The Hook-Component Pattern)

To ensure strict separation of concerns, follow this structure for all non-trivial components:

### 2.1 Pattern Definition
1. **Logic Layer (`useComponent.ts`)**: A custom hook containing all states, handlers, and data fetching logic.
2. **View Layer (`Component.tsx`)**: A functional component that receives all necessary data/callbacks via props. It should contain minimal to no `useState` or `useEffect`.

### 2.2 Example
```tsx
// logic: useCounter.ts
export const useCounter = (initial = 0) => {
  const [count, setCount] = useState(initial);
  const increment = () => setCount(prev => prev + 1);
  return { count, increment };
};

// view: Counter.tsx
interface CounterProps {
  count: number;
  onIncrement: () => void;
}
export const Counter = ({ count, onIncrement }: CounterProps) => (
  <button onClick={onIncrement} className="p-4 bg-[var(--lagoon)]">
    Count: {count}
  </button>
);
```

---

## 3. Responsive & Theming Rules

### 3.1 Responsive Design
- **Mobile First**: Use Tailwind's default breakpoints (`sm:`, `md:`, `lg:`, `xl:`).
- **Fluid Layouts**: Use `clamp()`, `min()`, `max()` or percentage widths for containers.
- **Touch Targets**: Ensure interactive elements are at least 44x44px on mobile.

### 3.2 Theming (Dark Mode)
- **CSS Variables ONLY**: Never use hex codes like `text-[#333]`. Use `text-[var(--sea-ink)]`.
- **Variable Definition**: Always define variables in `:root` and override in `:root[data-theme="dark"]` within `styles.css`.
- **Semantic Naming**: Use names that describe the *intent* (e.g., `--surface-bg`), not the *appearance* (e.g., `--light-gray`).

---

## 4. Code Quality & Maintenance (Updated)

- **Minimal `useEffect`**: Effects should be the absolute last resort.
  - For data fetching: Use **TanStack Query** (`useQuery`, `useSuspenseQuery`).
  - For event handling: Use event handlers directly (e.g., `onClick`, `onSubmit`).
  - For derived state: Compute values directly during render. If calculation is heavy, trust the **React Compiler**.
  - For synchronization: Prefer standard React state flows over syncing states via `useEffect`.

- **No Manual Optimization Hooks**:
  - Avoid `useMemo` and `useCallback` for performance optimization.
  - The project is designed to use **React Compiler** (React 19+) for automatic memoization.
  - Only use `useMemo` if a value *must* have stable referential identity for non-performance reasons (e.g., as a dependency for a legacy hook that isn't compiler-aware).

- **Type Safety**: No `any`. Use interfaces for component props.
- **Accessibility (a11y)**:
  - Use semantic HTML (`<main>`, `<section>`, `<article>`).
  - Ensure proper `aria-` labels for interactive elements without text.

---

## 6. Visual & Soulful Design Language (Mandatory)

All new components and pages must adhere to the "Soulful Echo" design system.

### 6.1 Design Philosophy
- **Empathy & Humanity**: Avoid robotic/technical copy. Use literary and evocative Chinese (e.g., "寻觅", "回响", "归途", "奇遇").
- **Minimalist Depth**: Use glassmorphism (backdrop-blur) and subtle background glows (Glows) instead of flat, solid colors.
- **Quiet Elegance**: Focus on light-weight typography, generous letter-spacing, and smooth transitions.

### 6.2 Visual Tokens
- **Containers**: Use `backdrop-blur-md`, `bg-white/[0.03]`, and `border-white/10` (1px subtle border).
- **Accents**: Use gradients from `Orange-400` to `Rose-400` (with varying opacities) for primary actions.
- **Ambient Glows**: Use absolute-positioned divs with `bg-primary/10` or `bg-orange-500/10` and `blur-[120px]` for background depth.
- **Typography**:
  - **Hero Titles**: `font-extralight`, `tracking-[0.2em]`, `text-white/90`.
  - **Subtitles**: `text-white/50`, `font-light`, `leading-relaxed`.
  - **Interactive Text**: `tracking-widest`, `font-light`.

### 6.3 Animation Standards
- **Entry**: Always use `animate-in fade-in` with `duration-700` or `1000`.
- **Feedback**: Subtle hover effects (e.g., `hover:scale-[1.02]`, `hover:bg-white/[0.05]`) rather than harsh color changes.

### 6.4 AI Enforcement
When generating code or designing UI for this project, you **MUST**:
1. Check if the component evokes the "quiet & soulful" aesthetic.
2. Avoid using default high-contrast Tailwind colors. Use opacities (e.g., `/60`, `/10`) for a softer feel.
3. Prioritize human-centric, poetic Chinese copy for all user-facing strings.
4. Ensure every page has a "breathing room" with sufficient padding and logical flow.

---

## 5. Enforcement for AI Agents
When generating code for this project, you **MUST**:
1. Check `styles.css` for available variables before adding new styles.
2. Separate logic into a hook if the component handles more than simple toggle states.
3. Verify mobile responsiveness using Tailwind utility classes.
4. Add `aria-label` to all buttons and icon-only links.
