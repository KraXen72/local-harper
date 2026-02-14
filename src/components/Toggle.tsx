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
				class="toggle toggle-accent"
			/>
			{props.label && (
				<span class="label-text">
					{props.label}
				</span>
			)}
		</label>
	);
};

export default Toggle;
