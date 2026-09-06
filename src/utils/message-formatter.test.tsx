/* @vitest-environment happy-dom */

import type { JSX } from 'solid-js';
import { createRoot } from 'solid-js';
import { render } from 'solid-js/web';
import { describe, expect, it } from 'vitest';
import { FormattedMessage, parseMessage } from './message-formatter';

// Helper to render a SolidJS component and return the container element.
function renderToDom(jsx: () => JSX.Element): HTMLElement {
	const container = document.createElement('div');
	createRoot((dispose) => {
		render(jsx, container);
		// dispose is not called here because we want the result, but in tests we don't clean up.
		// For simple assertions it's fine.
	});
	return container;
}

describe('parseMessage', () => {
	it('keeps plain text messages as a single text part', () => {
		expect(parseMessage('Nothing special here.')).toEqual([
			{ type: 'text', content: 'Nothing special here.' },
		]);
	});

	it('splits inline code spans out of surrounding text', () => {
		expect(parseMessage('Use `have` instead of `of`.')).toEqual([
			{ type: 'text', content: 'Use ' },
			{ type: 'code', content: 'have' },
			{ type: 'text', content: ' instead of ' },
			{ type: 'code', content: 'of' },
			{ type: 'text', content: '.' },
		]);
	});

	it('leaves unmatched backticks as text', () => {
		expect(parseMessage('Odd `input with emoji 😀')).toEqual([
			{ type: 'text', content: 'Odd `input with emoji 😀' },
		]);
	});
});

describe('FormattedMessage', () => {
	it('renders plain text without any code elements', () => {
		const container = renderToDom(() => <FormattedMessage message="Hello world" />);
		expect(container.innerHTML).not.toContain('<code');
		expect(container.textContent).toBe('Hello world');
	});

	it('renders code elements for backtick‑wrapped text', () => {
		const container = renderToDom(() => <FormattedMessage message="Use `have` instead" />);
		const codes = container.querySelectorAll('code');
		expect(codes.length).toBe(1);
		expect(codes[0].textContent).toBe('have');
	});

	it('renders text segments before, between, and after code parts', () => {
		const container = renderToDom(() => <FormattedMessage message="Before `code1` middle `code2` after" />);
		expect(container.innerHTML).toContain('Before ');
		expect(container.innerHTML).toContain(' middle ');
		expect(container.innerHTML).toContain(' after');
		const codes = container.querySelectorAll('code');
		expect(codes.length).toBe(2);
		expect(codes[0].textContent).toBe('code1');
		expect(codes[1].textContent).toBe('code2');
	});
});
