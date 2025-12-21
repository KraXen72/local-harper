import { For, Show, JSX } from 'solid-js';

type MessagePart = { type: 'text' | 'code'; content: string };

export function parseMessage(message: string): MessagePart[] {
	const parts: MessagePart[] = [];
	const regex = /`([^`]+)`/g;
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = regex.exec(message)) !== null) {
		// Add text before the backtick
		if (match.index > lastIndex) {
			parts.push({ type: 'text', content: message.slice(lastIndex, match.index) });
		}
		// Add the code part (without backticks)
		parts.push({ type: 'code', content: match[1] });
		lastIndex = regex.lastIndex;
	}

	// Add remaining text after the last match
	if (lastIndex < message.length) {
		parts.push({ type: 'text', content: message.slice(lastIndex) });
	}

	// If no matches, return the whole message as text
	if (parts.length === 0) {
		parts.push({ type: 'text', content: message });
	}

	return parts;
}

export function FormattedMessage(props: { message: string }): JSX.Element {
	const messageParts = () => parseMessage(props.message);

	return (
		<>
			<For each={messageParts()}>
				{(part) => (
					<Show
						when={part.type === 'code'}
						fallback={<>{part.content}</>}
					>
						<code class="px-1 py-0.5 bg-(--flexoki-ui-2) rounded text-xs font-mono">
							{part.content}
						</code>
					</Show>
				)}
			</For>
		</>
	);
}
