# local-harper
![screenshot](assets/screenshot1.png)

The main idea is that it uses Codemirror as the editor framework, since it's pretty lightweight and has a lot of plugins.  
- The suggestions are handled using `@codemirror/autocomplete` and some custom handling, so you can use both your keyboard and mouse to accept them
- The underlining is using `@codemirror/lint`, so it's properly integrated with the editor and doesen't have any de-syncing issues when scrolling

## todo
- [x] clicking on an issue in the sidebar should focus the editor so ctrl+space works
- [ ] gui dictionary manager
- [ ] WIP: gui rule manager (branch: rulemanager)
	- [x] initial implementation
	- [ ] nicer toggles
	- [ ] allow harper dialect changing
	- [ ] use valibot's safeParse for importing
	- [ ] switches' focus ring behaves weirdly
	- [ ] remove import/export format versioning
	- [ ] verify: allow imports where not all rules are defined
- [ ] introduce vitest and automated tests
	- [ ] run tests in CI
- [ ] move away from custom `HarperIssue` type to pure `OrganizedLint` or an extension of it.
- [ ] sidebar toggling
- [ ] implement tests so we can verify large refactors didn't break anything
- [ ] PWA support
	- [ ] test fully offline
- [ ] (maybe) move UI to daisyUI w custom, flexoki theme?
- [x] yoink the severities from https://writewithharper.com instead of ad-hoc heuristics
- [x] figure out how to publish on github pages (maybe cdn harper's wasm thing)
- [x] issues in sidebar shouldn't be sorted by kind or title, but by their logical location in the source document.

### nicer toggles
the current #file:RuleToggleItem.tsx 's toggle is not great. make a new toggle component in it's own .tsx file, inspired by this:
```html
<label class="inline-flex items-center cursor-pointer">
  <input type="checkbox" value="" class="sr-only peer">
  <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
  <span class="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">Toggle me</span>
</label>
```
but simplified where possible, and then use that in #file:RuleToggleItem.tsx 



## installation & try it out
pre-req: git, nodejs, [pnpm](https://pnpm.io/installation).
```bash
git clone https://github.com/KraXen72/local-harper
cd local-harper
pnpm i
pnpm dev
```

## testing text:
```
There are some cases where the the standard grammar
checkers don't cut it. That;s where Harper comes in handy.

Harper is an language checker for developers. It can detect
improper capitalization and misspellled words,
as well as a number of other issues.
Like if you break up words you shoul dn't.
Harper can be an lifesaver when writing technical documents, 
emails or other formal forms of communication.

Harper works everywhere, even when you're not online. Since your data
never leaves your device, you don't ned too worry aout us
selling it or using it to train large language models.

The best part: Harper can give you feedback instantly.
For most documents, Harper can serve up suggestions in
under 10 ms, faster that Grammarly.

The best part: Harper can give you feedback instantly,
For most documents, Harper can serve up suggestions in
under 10 ms, faster that Grammarly,
The best part: Harper can give you feedback instantly,
For most documents, Harper can serve up suggestions in
under 10 ms, faster that Grammarly,
The best part: Harper can give you feedback instantly,
For most documents, Harper can serve up suggestions in
under 10 ms, faster that Grammarly.
```
