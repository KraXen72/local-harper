import { Component, JSX } from 'solid-js';

export interface ToggleProps {
	checked: boolean;
	onChange: (checked: boolean) => void;
	label?: string;
	class?: string;
}

const Toggle: Component<ToggleProps> = (props) => {
	const handleChange: JSX.EventHandler<HTMLInputElement, Event> = (e) => {
		props.onChange(e.currentTarget.checked);
	};

	return (
		<label class={`inline-flex items-center cursor-pointer gap-3 ${props.class || ''}`}>
			<input
				type="checkbox"
				checked={props.checked}
				onChange={handleChange}
				class="sr-only peer"
			/>
			<div class="relative w-11 h-6 bg-(--flexoki-ui-3) peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-(--flexoki-cyan) peer-focus:ring-offset-2 peer-focus:ring-offset-(--flexoki-bg-2) rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-(--flexoki-cyan)" />
			{props.label && (
				<span class="text-sm font-medium text-(--flexoki-tx)">
					{props.label}
				</span>
			)}
		</label>
	);
};

export default Toggle;
