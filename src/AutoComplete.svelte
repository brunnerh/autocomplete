<script type="text/typescript">
	import { createEventDispatcher, onDestroy, tick } from 'svelte';
	import type { Item, SearchFunction, ResultListItem } from './types';
	
	const dispatch = createEventDispatcher();

	const regExpEscape = (s: string) =>
		s.replace(/[-\\^$*+?.()|[\]{}]/g, "\\$&");
	const htmlEscape = (s: string) =>
		s.replace(/[\u00A0-\u9999<>"&]/gim, i => `&#${i.charCodeAt(0)};`);

	/** `id` attribute of the input element. */
	export let id: string | undefined = undefined;
	/** `name` attribute of the input element. */
	export let name: string | undefined = undefined;
	/** Class to apply to the input element. */
	export let className: string = '';
	/** Placeholder text. */
	export let placeholder: string | undefined = undefined;
	/** Title attribute text. */
	export let title: string | undefined = undefined;
	/** Whether the input is required. */
	export let required: boolean = false;
	/** Whether the input is disabled. */
	export let disabled: boolean = false;
	/** Sets the `tabindex` attribute of the input element. */
	export let tabindex: number | undefined = undefined;
	/**
	 * Automatically scrolls the component into view.
	 * Can be helpful if the component is at the bottom a scrollable area
	 * and the dropdown ends up off-screen.
	 */
	export let autoScroll: boolean = true;
	/**
	 * Automatically scrolls to the cursor position in the list.
	 * Turn off if there are performance issues.
	 */
	export let autoScrollCursor: boolean = true;

	/**
	 * Gets a list of items that can be completed.
	 * Can return a promise to load data asynchronously.
	 * Returning an existing promise if the list can be cached is recommended.
	 * 
	 * Items have to be strings or of the form { key: string, value?: any }.
	 * The key will be searched in and displayed.
	 * The value represents a technical item value that can be extracted via binding
	 * the `value` property.
	 */
	export let items: () => Item[] = () => [];

	/** Whether the item dropdown is opened. */
	export let isOpen: boolean = false;
	/** Currently selected key. See `items` property. */
	export let key: string | null = null;
	/** Currently selected value. See `items` property. */
	export let value: any = null;
	/** Items matching the search. */
	export let results: Item[] = [];
	/** The search string. */
	export let search: string = '';
	/** Whether the datasource is currently loading. */
	export let isLoading: boolean = false;
	/** Currently highlighted list item index. */
	export let cursor: number = 0;
	/** Currently highlighted list item. */
	export let cursorItem: any = undefined;
	/** Maximal number of items to show in list at a time. */
	export let maxItems: number | undefined = undefined;
	/** Whether the search string has to appear at the start of the item. */
	export let fromStart: boolean = false;
	/** Whether the search is case-sensitive. */
	export let caseSensitive: boolean = false;
	/** Minimum number of characters required to trigger a search. */
	export let minChar: number = 0;
	/** Time to wait in milliseconds before triggering a search. */
	export let debounce: number = 0;
	/**
	 * Sets whether suggested items are directly selected upon
	 * arrow up/down while the dropdown is closed.
	 */
	export let blindSelection: boolean = false;

	/**
	 * Whether the DOM elements for the list are only created
	 * upon filtering/opening the suggestions dropdown.
	 */
	export let lazyDropdown: boolean = false;

	/**
	 * Custom search RegEx.
	 * If set, `fromStart` and `caseSensitive` will not be used.
	 */
	export let searchRegEx: ((search: string) => RegExp) | null = null;

	/**
	 * Custom search function.
	 * If set, `fromStart`, `caseSensitive` and `searchRegEx` will not be used.
	 * {@type (search: string) => (text: string) => {
	 *     matches: boolean,
	 *     highlights: [number, number][], // Array of start and end index tuples
	 * }}
	 */
	export let searchFunction: SearchFunction | null = null;

	let input: HTMLInputElement | null = null;
	let inputFocused = false;
	let dropdownElement: HTMLDivElement | null = null;
	let hasSearched = false;

	let resultListItems: ResultListItem[] = [];

	$: searchFlags = caseSensitive ? '' : 'i';
	$: effectiveSearchRegEx = searchRegEx != null ? searchRegEx
		: fromStart
			? (q: string) => RegExp('^' + regExpEscape(q), searchFlags)
			: (q: string) => RegExp(regExpEscape(q), searchFlags);
	$: effectiveSearchFunction = searchFunction != null
		? searchFunction : defaultSearch;

	$: if (cursor > results.length - 1)
		cursor = Math.max(0, results.length - 1);
	
	$: if (search.length >= minChar) {
		const matcher = effectiveSearchFunction(search);

		resultListItems = results
			.map((item, index) => {
				const text = typeof item !== 'string' ? item.key : item;
				
				const { matches, highlights } = matcher(text);

				let lastHighlightEnd = 0;
				const parts = []
				for (const [start, end] of highlights) {
					const head = text.substring(lastHighlightEnd, start);
					const highlightText = text.substring(start, end);
					const highlightClass = 'ac-match';
					const highlight = `<span class=${highlightClass}>${htmlEscape(highlightText)}</span>`;

					parts.push(htmlEscape(head), highlight);
					lastHighlightEnd = end;
				}
				
				const tail = text.substring(lastHighlightEnd);
				parts.push(htmlEscape(tail));

				return {
					index,
					key: text,
					value: typeof item !== 'string' ? item.value : item,
					label: parts.join(''),
				};
			});
	}

	$: cursorItem = results[cursor];

	let debounceHandle: number | undefined = undefined;

	onDestroy(() => clearTimeout(debounceHandle));

	const defaultSearch = (query: string) => {
		const regex = effectiveSearchRegEx(query);

		return (text: string) => {
			const highlights = [];

			let match;
			let matchCount = 0;
			while ((match = regex.exec(text)) !== null) {
				highlights.push([match.index, match.index + match[0].length]);
				matchCount++;

				if (regex.global == false)
					break;

				if (matchCount > text.length)
					// Panic
					break;
			}

			return {
				matches: highlights.length > 0,
				highlights,
			};
		}
	};
	
	function onInput(event: Event) {
		queueQuery();

		dispatch(event.type, event);
	}

	function queueQuery() {
		if (search.length >= minChar) {
			clearTimeout(debounceHandle);
			debounceHandle = window.setTimeout(runQuery, debounce);
		}
	}

	async function runQuery() {
		if (inputFocused)
			open();

		isLoading = true;
		await filterResults(search);
		isLoading = false;
	}

	async function filterResults(search: string) {
		hasSearched = true;

		if (typeof items != 'function')
			throw new Error('Property "items" has to be a function.');

		const loadedItems = await items();
		
		const matcher = effectiveSearchFunction(search);

		results = loadedItems
			.filter(item => {
				let text = typeof item === 'string' ?
					item : item.key;

				if (typeof text !== 'string')
					text = '';

				return matcher(text).matches;
			})
			.slice(0, maxItems);

		dispatch('filtered', results);
	}

	function onKeyDown(event: KeyboardEvent) {
		switch (event.key)
		{
			case 'ArrowDown':
				event.preventDefault();
				if (cursor < results.length - 1)
					cursor = cursor + 1;

				if (blindSelection && isOpen == false)
					select();
				break;

			case 'ArrowUp':
				event.preventDefault();
				if (cursor > 0)
					cursor =  cursor - 1;

				if (blindSelection && isOpen == false)
					select();
				break;

			case 'Enter':
				event.preventDefault()
				if (isOpen) {
					if (cursor === -1) {
						cursor = 0;
					}
					select();
				}
				else {
					activate();
				}
				break;

			case 'Escape':
				event.preventDefault()
				close();
				break;
		}

		dispatch(event.type, event);
	}

	function onFocus(event: FocusEvent) {
		inputFocused = true;
		activate();

		dispatch(event.type, event);
	}

	function onBlur(event: FocusEvent) {
		inputFocused = false;
		isOpen = false;

		dispatch(event.type, event);
	}

	function onClick(event: MouseEvent) {
		activate();

		dispatch(event.type, event);
	}

	function activate() {
		if (search.length >= minChar)
			open();

		if (hasSearched == false)
			queueQuery();
	}

	function onItemClick(event: MouseEvent, index: number) {
		event.stopPropagation();
		cursor = index;

		select();
	}

	function open() {
		if (isOpen)
			return;

		isOpen = true;
		if (results.length > 0 && cursor < 0)
			cursor = 0;

		results.length > 0
	}

	function close() {
		if (isOpen == false)
			return;

		isOpen = false;
	}

	function select() {
		if (cursor <= -1 || results[cursor] == undefined)
			return;

		const item = resultListItems[cursor];
		value = item.value;
		key = item.key;
		search = key;
		close();

		dispatch('item-selected', results[cursor]);
	}

	function autoScrollComponent(
		node: HTMLElement, { condition, dropdown }: AutoScrollParameters
	) {
		const autoScroll = () => {
			if (condition() == false)
				return;

			const scrollFunction = 'scrollIntoViewIfNeeded' in Element.prototype
				// @ts-ignore
				? Element.prototype.scrollIntoViewIfNeeded
				: Element.prototype.scrollIntoView;

			const dropdownNode = dropdown();
			if (dropdownNode != null)
				scrollFunction.call(dropdownNode);

			scrollFunction.call(node);
		};

		autoScroll();

		return {
			update: async () => {
				await tick();

				autoScroll();
			}
		} 
	}

	function autoScrollItem(
		node: HTMLElement, { condition, viewport }: AutoScrollItemParameters
	) {
		const autoScroll = () => {
			const viewportNode = viewport();
			if (viewportNode == null || condition() == false)
				return;
			
			const nodeRect = node.getBoundingClientRect();
			const viewportRect = viewportNode.getBoundingClientRect();
			if (nodeRect.top < viewportRect.top)
				viewportNode.scrollTop = node.offsetTop;
			else if (nodeRect.bottom > viewportRect.bottom)
				viewportNode.scrollTop = node.offsetTop -
					viewportNode.clientHeight + nodeRect.height;
		}

		autoScroll();

		return {
			update: async () => {
				await tick();

				autoScroll();
			}
		} 
	}

	interface AutoScrollParameters
	{
		condition: () => boolean;
		dropdown: () => HTMLElement | null;
	}

	interface AutoScrollItemParameters
	{
		condition: () => boolean;
		viewport: () => HTMLElement | null;
	}
</script>

<style>
	:global(:root) {
		--ac-input-color: black;
		--ac-input-background: white;
		--ac-input-border: 1px solid hsl(0, 0%, 60%);
		--ac-input-border-radius: 0;
		--ac-input-padding: 3px;
		--ac-input-margin: 0;
		--ac-input-font-size: small;
		--ac-input-font-weight: normal;

		--ac-dropdown-box-shadow: 0px 2px 5px hsla(0, 0%, 0%, 0.7);
		--ac-dropdown-margin: 0;
		--ac-dropdown-padding: 0;
		--ac-dropdown-border-radius: 0;

		--ac-loading-color: inherit;
		--ac-loading-background: none;
		--ac-loading-padding: 0;
		--ac-loading-margin: 5px;

		--ac-result-color: inherit;
		--ac-result-background: none;
		--ac-result-border: none;
		--ac-result-margin: 0;
		--ac-result-padding: 0.2em 0.5em;
		--ac-result-border-radius: 0;

		--ac-result-highlighted-color: inherit;
		--ac-result-highlighted-background: #dbdbdb;

		--ac-result-match-color: inherit;
		--ac-result-match-background: none;
		--ac-result-match-border-radius: 0;
		--ac-result-match-font-weight: bold;
		--ac-result-match-font-style: inherit;
	}

	* {
		box-sizing: border-box;
	}

	.autocomplete {
		position: relative;
	}

	.autocomplete-input {
		width: 100%;
		color: var(--ac-input-color);
		background: var(--ac-input-background);
		border: var(--ac-input-border);
		border-radius: var(--ac-input-border-radius);
		padding: var(--ac-input-padding);
		margin: var(--ac-input-margin);
		font-size: var(--ac-input-font-size);
		font-weight: var(--ac-input-font-weight);
	}

	.autocomplete-results-dropdown {
		position: absolute;
		z-index: 100;
		max-height: 14.5em;
		overflow: auto;
		width: 100%;

		color: var(--ac-dropdown-color, var(--ac-input-color));
		background: var(--ac-dropdown-background, var(--ac-input-background));
		box-shadow: var(--ac-dropdown-box-shadow);
		margin: var(--ac-dropdown-margin);
		padding: var(--ac-dropdown-padding);
		border-radius: var(--ac-dropdown-border-radius);
	}

	.hidden {
		display: none;
	}

	.autocomplete-loading {
		color: var(--ac-loading-color);
		background: var(--ac-loading-background);
		padding: var(--ac-loading-padding);
		margin: var(--ac-loading-margin);
	}

	.autocomplete-results-list {
		padding: 0;
		margin: 0;
	}

	.autocomplete-result {
		color: var(--ac-result-color);
		background: var(--ac-result-background);
		border: var(--ac-result-border);
		margin: var(--ac-result-margin);
		padding: var(--ac-result-padding);
		border-radius: var(--ac-result-border-radius);

		list-style: none;
		text-align: left;
		cursor: pointer;
		white-space: nowrap;
	}

	.autocomplete-result.ac-highlighted {
		color: var(--ac-result-highlighted-color, var(--ac-result-color));
		background: var(--ac-result-highlighted-background, var(--ac-result-background));
		border: var(--ac-result-highlighted-border, var(--ac-result-border));
		margin: var(--ac-result-highlighted-margin, var(--ac-result-margin));
		padding: var(--ac-result-highlighted-padding, var(--ac-result-padding));
		border-radius: var(--ac-result-highlighted-border-radius, var(--ac-result-border-radius));
	}

	.autocomplete-result :global(.ac-match) {
		color: var(--ac-result-match-color);
		background: var(--ac-result-match-background);
		font-weight: var(--ac-result-match-font-weight);
		font-style: var(--ac-result-match-font-style);
		border-radius: var(--ac-result-match-border-radius);
	}
</style>

<svelte:window on:click="{() => close()}" />

<div class="autocomplete"
	on:click="{event => event.stopPropagation()}"
	use:autoScrollComponent={{
		condition: () => autoScroll && isOpen,
		dropdown: () => dropdownElement,
		isOpen,
		results
	}}>
	<input bind:this={input} type="text"
		{id} {name}
		class="autocomplete-input {className}"
		{placeholder} {title}
		{required} {disabled} {tabindex}
		autocomplete={name}
		bind:value={search}
		on:input={onInput}
		on:focus={onFocus}
		on:blur={onBlur}
		on:click={onClick}
		on:keydown={onKeyDown}>

	{#if lazyDropdown == false || isOpen}
		<div bind:this={dropdownElement} 
			class="autocomplete-results-dropdown"
			class:hidden={!isOpen}>
			{#if isLoading}
				<div class="autocomplete-loading">
					<slot name="loading">Loading data...</slot>
				</div>
			{/if}

			<ul class="autocomplete-results-list"
				class:hidden={isLoading}>
				{#each resultListItems as result, index (result.key)}
					<li on:mousedown={e => onItemClick(e, index)}
						class="autocomplete-result"
						class:ac-highlighted={index === cursor}
						on:mousemove={() => cursor = index}
						use:autoScrollItem={{
							viewport: () => dropdownElement,
							condition: () => autoScrollCursor && index === cursor,
							isOpen,
						}}>
						<slot name="template" {result}>
							{@html result.label}
						</slot>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>