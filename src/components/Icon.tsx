import { Component } from 'solid-js';
import 'iconify-icon';

interface IconProps {
	icon: string;
	class?: string;
	width?: string | number;
	height?: string | number;
}

declare module 'solid-js' {
	namespace JSX {
		interface IntrinsicElements {
			'iconify-icon': {
				icon?: string;
				class?: string;
				width?: string | number;
				height?: string | number;
			};
		}
	}
}

/**
 * Wrapper component for Iconify icons.
 * Uses lucide icons from @iconify-json/lucide package.
 * 
 * @example
 * <Icon icon="lucide:x" class="w-4 h-4" />
 * <Icon icon="lucide:settings" class="w-5 h-5 text-blue-500" />
 */
const Icon: Component<IconProps> = (props) => {
	return (
		<iconify-icon
			icon={props.icon}
			width={props.width}
			height={props.height}
			class={props.class}
		/>
	);
};

export default Icon;