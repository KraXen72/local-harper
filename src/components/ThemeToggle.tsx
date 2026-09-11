import { Component, For } from 'solid-js';
import type { ThemePreference } from '../utils/theme';

interface ThemeToggleProps {
	value: ThemePreference;
	onChange: (theme: ThemePreference) => void;
}

const OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
	{ value: 'system', label: 'System theme', icon: 'lucide--monitor' },
	{ value: 'light', label: 'Light theme', icon: 'lucide--sun' },
	{ value: 'dark', label: 'Dark theme', icon: 'lucide--moon' },
];

/** Three-state theme picker for system, Flexoki Light, and Flexoki Dark. */
const ThemeToggle: Component<ThemeToggleProps> = (props) => (
	<div
		class="flex items-center rounded-md bg-(--flexoki-bg) p-0.5"
		role="radiogroup"
		aria-label="Theme"
	>
		<For each={OPTIONS}>
			{(option) => (
				<button
					type="button"
					role="radio"
					aria-checked={props.value === option.value}
					aria-label={option.label}
					title={option.label}
					onClick={() => props.onChange(option.value)}
					class="flex h-6 w-7 cursor-pointer items-center justify-center rounded-sm text-(--flexoki-tx-2) transition-colors hover:bg-(--flexoki-ui-2) focus:outline-none focus:ring-2 focus:ring-(--flexoki-cyan)"
					classList={{
						'bg-(--flexoki-ui-3) text-(--flexoki-tx) shadow-sm': props.value === option.value,
					}}
				>
					<span class={`iconify ${option.icon} h-3.5 w-3.5`} />
				</button>
			)}
		</For>
	</div>
);

export default ThemeToggle;
