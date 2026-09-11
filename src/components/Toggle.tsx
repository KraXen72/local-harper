import { Component, JSX } from 'solid-js';

export interface ToggleProps {
	checked: boolean;
	onChange: (checked: boolean) => void;
	ariaLabel: string;
	class?: string;
}

const Toggle: Component<ToggleProps> = (props) => {
	const handleChange: JSX.EventHandler<HTMLInputElement, Event> = (e) => {
		props.onChange(e.currentTarget.checked);
	};

	return (
		<label class={`relative inline-flex items-center cursor-pointer gap-3 ${props.class || ''}`}>
			<input
				type="checkbox"
				checked={props.checked}
				onChange={handleChange}
				aria-label={props.ariaLabel}
				class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 peer"
			/>
			<div class="pointer-events-none relative w-11 h-6 bg-(--flexoki-ui-3) shadow-inner peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-(--focus-ring) peer-focus:ring-offset-2 peer-focus:ring-offset-(--flexoki-bg-2) rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-(--toggle-thumb) after:shadow-sm after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:bg-(--flexoki-cyan)" />
		</label>
	);
};

export default Toggle;
