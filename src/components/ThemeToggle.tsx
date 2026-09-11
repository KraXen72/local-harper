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
		class="flex items-center gap-0.5 rounded-md border border-(--flexoki-ui-3) bg-(--flexoki-ui) p-1 shadow-[inset_0_1px_3px_var(--overlay-shadow)]"
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
					class="flex h-6 w-7 cursor-pointer items-center justify-center rounded-[3px] text-(--flexoki-tx-2) transition-colors duration-150 hover:text-(--flexoki-tx) focus:outline-none"
					classList={{
						'bg-(--toggle-thumb) text-(--toggle-thumb-icon) shadow-[0_1px_2px_var(--overlay-shadow),inset_0_0_0_1px_rgba(16,15,15,0.08)]': props.value === option.value,
					}}
				>
					<span class={`iconify ${option.icon} h-3.5 w-3.5`} />
				</button>
			)}
		</For>
	</div>
);

export default ThemeToggle;
