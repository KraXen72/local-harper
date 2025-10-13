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
			class="p-3 rounded-md border cursor-pointer transition-all duration-150 ease-in-out focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1"
			classList={{
				'bg-blue-50 border-blue-400 shadow-sm': props.isSelected,
				'bg-white border-gray-300 hover:border-gray-400 hover:shadow-sm': !props.isSelected,
			}}
			onClick={handleClick}
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					handleClick();
				}
			}}
		>
			<div class="flex items-start gap-2">
				<span 
					class={`inline-block w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getSeverityColor()} transition-all duration-200`}
					classList={{ 'scale-125': props.isSelected }}
				/>
				<div class="flex-1 min-w-0">
					<p class="text-sm text-gray-900 leading-relaxed">{props.issue.lint.message()}</p>
					<p class="text-xs text-gray-600 mt-1 font-mono bg-gray-100 px-1.5 py-0.5 rounded inline-block">
						"{props.issue.lint.get_problem_text()}"
					</p>

					<Show when={isExpanded()}>
						<div class="mt-3 space-y-1.5 animate-[fadeIn_150ms_ease-in]" onClick={(e) => e.stopPropagation()}>
							<Show when={hasSuggestions()}>
								<div class="text-xs font-medium text-gray-700 mb-2">Suggestions:</div>
								<For each={suggestions()}>
									{(suggestion) => (
										<button
											class="block w-full text-left px-2.5 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
											onClick={() => handleApplySuggestion(suggestion)}
										>
											<Show
												when={suggestion.kind() === SuggestionKind.Replace}
												fallback={<span class="text-gray-600 italic">(Remove)</span>}
											>
												<span class="font-medium">{suggestion.get_replacement_text()}</span>
											</Show>
										</button>
									)}
								</For>
							</Show>

							<Show when={isSpellingError()}>
								<button
									class="block w-full text-left px-2.5 py-1.5 text-xs bg-green-100 hover:bg-green-200 border border-green-300 text-green-800 font-medium rounded transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
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
