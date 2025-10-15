---
applyTo: "**"
---
# AI Coding Assistant Instructions

## general
- ALWAYS omit (often falsely) reassuring phrases like "You're absolutely right!", "I understand the issue!".
- Think long and hard about any problem you're facing. Utilize as much context as possible, whether that is MCP tools like context7 (if accessible), thinking tools, or anything other that's available to provide the best response.
- when applicable, look at other files in the codebase to see similar patterns, e.g. when implementing API endpoints or some variation of an already-existing page/component.
- ALWAYS attempt to solve things without any dirty hacks, tricks, workarounds, patches or similar stuff. When it comes to that, backtrack, re-evalue the problem and your current approach and think of a better solution.
- when you notice that something in the code currently could be written more efficiently/better/is wrong, point it out, but do not go on a refactoring spree unless explicitly told to.

## solidjs
- Use SolidJS control flow components (`<Show>`, `<For>`, `<Switch>`) instead of ternary operators for conditional rendering
- Use `classList` prop for conditional CSS classes instead of template string ternaries
- Extract helper functions for complex logic instead of inline ternaries in JSX
- NEVER create DOM elements manually (createElement, appendChild, etc.). ALWAYS create a proper .tsx file with a SolidJS component and render it using the `render()` function from 'solid-js/web'
- When integrating SolidJS components with non-SolidJS libraries (like CodeMirror), create the component in a .tsx file and use `render()` to mount it
- Use Iconify icons with Tailwind CSS classes instead of raw SVG elements. Example: `<span class="iconify lucide--settings w-4 h-4" />`. Note the double dash separator between icon set and icon name.

## programming style
- do not overcomplicate stuff. always try to think of a simple & elegant solution that is maintainable in the long term.
- the best solution is usually the shortest one (in terms of LOC). Do not add arbitrary complexity.
- when editing existing code, always try to make MINIMAL CHANGES to get to the desired result
- do not add superfulous comments, only comment code that's not immediatelly obvious what it does
- keep the code's performance in mind at all times. implement solutions that are fast, yet readable

## tool use
- use the current package manager tool, e.g. pnpm instead of the default (npm) if applicable.

## typescript
- always strive to use typescript's full potential, i.e. generics, utility types, etc. and available global/importable types to type everything properly. You MUST NEVER use the any type. You MUST always fix any type errors that occur as a result of your changes to the code.
- Prefer explicitly defined object types using `type SomeObj = { ... }` or `interface` to using inline types.