import { Component, For, Show } from 'solid-js';
import type { HarperIssue, Suggestion } from '../types';
import { SuggestionKind } from '../types';

export interface ContextMenuProps {
	issue: HarperIssue;
	onApplySuggestion: (suggestion: Suggestion) => void;
	onAddToDictionary: (word: string) => void;
	onIgnore: () => void;
	onClose: () => void;
}

type MenuItem = {
	type: 'suggestion' | 'dictionary' | 'ignore';
	suggestion?: Suggestion;
	text: string;
	className: string;
};

const ContextMenu: Component<ContextMenuProps> = (props) => {

	const suggestions = () => props.issue.lint.suggestions();
	const isSpelling = () => props.issue.lint.lint_kind().toLowerCase().includes('spelling');
	
	// Build menu items array
	const menuItems = (): MenuItem[] => {
		const items: MenuItem[] = [];
		
		// Add suggestions
		suggestions().forEach(suggestion => {
			const kind = suggestion.kind();
			const isRemove = kind === SuggestionKind.Remove;
			const text = isRemove ? '(Remove)' : suggestion.get_replacement_text();
			const className = isRemove 
				? 'cm-context-menu-button cm-context-menu-button-secondary' 
				: 'cm-context-menu-button';
			
			items.push({
				type: 'suggestion',
				suggestion,
				text,
				className,
			});
		});
		
		// Add to dictionary for spelling errors
		if (isSpelling()) {
			items.push({
				type: 'dictionary',
				text: 'Add to Dictionary',
				className: 'cm-context-menu-button cm-context-menu-button-success',
			});
		}
		
		// Add ignore button
		items.push({
			type: 'ignore',
			text: 'Ignore',
			className: 'cm-context-menu-button cm-context-menu-button-secondary',
		});
		
		return items;
	};
	
	// Determine if we should use grid layout
	const useGrid = () => {
		const items = menuItems();
		const suggestionCount = suggestions().length;
		
		// Use grid if more than 4 suggestions
		if (suggestionCount > 4) {
			return true;
		}
		
		// Use grid if only 1 suggestion <= 6 chars and there's an ignore button
		if (suggestionCount === 1) {
			const firstSuggestion = suggestions()[0];
			const text = firstSuggestion.kind() === SuggestionKind.Remove 
				? '(Remove)' 
				: firstSuggestion.get_replacement_text();
			if (text.length <= 6 && items.length > 1) {
				return true;
			}
		}
		
		return false;
	};

	const handleItemClick = (item: MenuItem) => {
		switch (item.type) {
			case 'suggestion':
				if (item.suggestion) {
					props.onApplySuggestion(item.suggestion);
				}
				break;
			case 'dictionary':
				props.onAddToDictionary(props.issue.lint.get_problem_text());
				break;
			case 'ignore':
				props.onIgnore();
				break;
		}
	};

	return (
		<div class="cm-context-menu">
			{/* Header */}
			<div class="cm-context-menu-title">
				<span>{props.issue.lint.message()}</span>
				<span class="cm-context-menu-info-icon" title={props.issue.lint.lint_kind()}>
					ⓘ
				</span>
				<button
					class="cm-context-menu-close"
					onClick={() => props.onClose()}
					onMouseDown={(e) => e.preventDefault()}
				>
					×
				</button>
			</div>

			{/* Suggestions */}
			<Show when={suggestions().length > 0}>
				<div class="cm-context-menu-section-title">Suggestions:</div>
				<div classList={{ 'cm-context-menu-suggestions-grid': useGrid() }}>
					<For each={menuItems()}>
						{(item) => (
							<Show when={item.type === 'suggestion'}>
								<button
									class={item.className}
									onClick={() => handleItemClick(item)}
									onMouseDown={(e) => e.preventDefault()}
								>
									{item.text}
								</button>
							</Show>
						)}
					</For>
				</div>
			</Show>

			{/* Dictionary button */}
			<Show when={isSpelling()}>
				<button
					class="cm-context-menu-button cm-context-menu-button-success"
					onClick={() => handleItemClick(menuItems().find(i => i.type === 'dictionary')!)}
					onMouseDown={(e) => e.preventDefault()}
				>
					Add to Dictionary
				</button>
			</Show>

			{/* Ignore button */}
			<button
				class="cm-context-menu-button cm-context-menu-button-secondary"
				onClick={() => handleItemClick(menuItems().find(i => i.type === 'ignore')!)}
				onMouseDown={(e) => e.preventDefault()}
			>
				Ignore
			</button>
		</div>
	);
};

export default ContextMenu;
