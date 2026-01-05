import { Component, For, Show } from 'solid-js';
import type { HarperIssue, Suggestion } from '../types';
import { FormattedMessage } from '../utils/message-formatter';
import { lintKindColor, lintKindColorWithAlpha } from '../utils/lint-kind-colors';
import { SuggestionKind } from '../types';

interface SuggestionMenuProps {
	issue: HarperIssue;
	onApplySuggestion: (suggestion: Suggestion) => void;
	onAddToDictionary: (word: string) => void;
	onIgnore: () => void;
}

const SuggestionMenu: Component<SuggestionMenuProps> = (props) => {
	const color = () => lintKindColor(props.issue.lint.lint_kind());
	const bgColor = () => lintKindColorWithAlpha(props.issue.lint.lint_kind(), 0.2);
	const suggestions = () => props.issue.lint.suggestions();

	return (
		<div class="bg-[var(--flexoki-bg)] border border-[var(--flexoki-ui-2)] rounded-lg shadow-lg p-3 min-w-[200px] max-w-[300px]">
			{/* Header with severity and rule info */}
			<div class="flex items-center gap-2 mb-3">
				<span
					class="px-2 py-1 text-xs font-medium rounded whitespace-nowrap"
					style={{
						"background-color": bgColor(),
						"color": color()
					}}
				>
					{props.issue.lint.lint_kind_pretty()}
				</span>
				<span class="text-xs text-[var(--flexoki-tx-3)] flex-1 truncate" title={props.issue.rule}>
					{props.issue.rule}
				</span>
			</div>

			{/* Message */}
			<div class="mb-3">
				<FormattedMessage message={props.issue.lint.message()} />
			</div>

			{/* Suggestions */}
			<Show when={suggestions().length > 0}>
				<div class="space-y-1 mb-3">
					<For each={suggestions()}>
						{(suggestion) => {
							const kind = suggestion.kind();
							const isRemove = kind === SuggestionKind.Remove;
							const replacementText = isRemove ? '' : suggestion.get_replacement_text();
							const label = isRemove ? '(Remove)' : replacementText;

							return (
								<button
									class="w-full text-left px-3 py-2 bg-[var(--flexoki-ui)] hover:bg-[var(--flexoki-ui-2)] border border-[var(--flexoki-ui-3)] rounded text-sm transition-colors cursor-pointer"
									onClick={() => props.onApplySuggestion(suggestion)}
									type="button"
								>
									{label}
								</button>
							);
						}}
					</For>
				</div>
			</Show>

			{/* Actions */}
			<div class="space-y-1">
				<Show when={props.issue.lint.lint_kind() === 'Spelling'}>
					<button
						class="w-full text-left px-3 py-2 bg-[var(--flexoki-ui)] hover:bg-[var(--flexoki-ui-2)] border border-[var(--flexoki-ui-3)] rounded text-sm transition-colors cursor-pointer"
						onClick={() => props.onAddToDictionary(props.issue.lint.message())}
						type="button"
					>
						Add to dictionary
					</button>
				</Show>
				<button
					class="w-full text-left px-3 py-2 bg-[var(--flexoki-ui)] hover:bg-[var(--flexoki-ui-2)] border border-[var(--flexoki-ui-3)] rounded text-sm transition-colors cursor-pointer"
					onClick={props.onIgnore}
					type="button"
				>
					Ignore
				</button>
			</div>
		</div>
	);
};

export default SuggestionMenu;