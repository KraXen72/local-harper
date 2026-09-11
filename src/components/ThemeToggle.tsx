import { Component, For } from 'solid-js';
import type { ThemePreference } from '../utils/theme';

interface ThemeToggleProps {
	value: ThemePreference;
	onChange: (theme: ThemePreference) => void;
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
	{ value: 'system', label: 'System theme', icon: 'lucide--monitor' },
	{ value: 'light', label: 'Light theme', icon: 'lucide--sun' },
	{ value: 'dark', label: 'Dark theme', icon: 'lucide--moon' },
];

/** A compact, keyboard-accessible three-position theme preference control. */
const ThemeToggle: Component<ThemeToggleProps> = (props) => {
	const selectedIndex = () => THEME_OPTIONS.findIndex((option) => option.value === props.value);

	return (
		<div
			class="theme-toggle"
			style={{ '--theme-index': selectedIndex() }}
			role="radiogroup"
			aria-label="Theme preference"
			data-testid="theme-toggle"
		>
			<span class="theme-toggle-thumb" aria-hidden="true" />
			<For each={THEME_OPTIONS}>
				{(option) => (
					<button
						type="button"
						role="radio"
						aria-checked={props.value === option.value}
						aria-label={option.label}
						title={option.label}
						onClick={() => props.onChange(option.value)}
						class="theme-toggle-option"
						classList={{ 'theme-toggle-option-active': props.value === option.value }}
					>
						<span class={`iconify ${option.icon}`} aria-hidden="true" />
					</button>
				)}
			</For>
		</div>
	);
};

export default ThemeToggle;
