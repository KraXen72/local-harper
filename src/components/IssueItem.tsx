import { Component, For, Show, createSignal } from 'solid-js';
import type { IssueItemProps } from '../types';
import { SuggestionKind } from '../types';

const IssueItem: Component<IssueItemProps> = (props) => {
	const [isExpanded, setIsExpanded] = createSignal(false);

	const suggestions = () => props.issue.lint.suggestions();
	const hasSuggestions = () => suggestions().length > 0;
	const isSpellingError = () => props.issue.lint.lint_kind().toLowerCase().includes('spelling');

	const getSeverityColor = () => {
		switch (props.issue.severity) {
			case 'error': return 'bg-red-500';
			case 'warning': return 'bg-yellow-500';
			default: return 'bg-blue-500';
		}
	};

	const handleClick = () => {
		props.onSelect(props.issue.id);
		setIsExpanded(!isExpanded());
	};

	const handleApplySuggestion = (suggestion: ReturnType<typeof suggestions>[number]) => {
		props.onApplySuggestion(suggestion);
	};

	const handleAddToDictionary = () => {
		const word = props.issue.lint.get_problem_text();
		props.onAddToDictionary(word);
	};

	return (
		<div
			class="p-2 rounded border cursor-pointer transition-colors"
			classList={{
				'bg-blue-50 border-blue-400': props.isSelected,
				'bg-white border-gray-300 hover:border-gray-400': !props.isSelected,
			}}
			onClick={handleClick}
		>
			<div class="flex items-start gap-2">
				<span class={`inline-block w-2 h-2 rounded-full mt-1 flex-shrink-0 ${getSeverityColor()}`} />
				<div class="flex-1 min-w-0">
					<p class="text-sm text-gray-900">{props.issue.lint.message()}</p>
					<p class="text-xs text-gray-500 mt-0.5">
						"{props.issue.lint.get_problem_text()}"
					</p>

					<Show when={isExpanded()}>
						<div class="mt-2 space-y-1" onClick={(e) => e.stopPropagation()}>
							<Show when={hasSuggestions()}>
								<div class="text-xs text-gray-600 mb-1">Suggestions:</div>
								<For each={suggestions()}>
									{(suggestion) => (
										<button
											class="block w-full text-left px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded transition-colors"
											onClick={() => handleApplySuggestion(suggestion)}
										>
											<Show
												when={suggestion.kind() === SuggestionKind.Replace}
												fallback={<span class="text-gray-600">(Remove)</span>}
											>
												{suggestion.get_replacement_text()}
											</Show>
										</button>
									)}
								</For>
							</Show>

							<Show when={isSpellingError()}>
								<button
									class="block w-full text-left px-2 py-1 text-xs bg-green-100 hover:bg-green-200 border border-green-300 text-green-800 rounded transition-colors"
									onClick={handleAddToDictionary}
								>
									Add to Dictionary
								</button>
							</Show>
						</div>
					</Show>
				</div>
			</div>
		</div>
	);
};

export default IssueItem;
