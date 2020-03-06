<script>
	import { createEventDispatcher, onDestroy, tick } from 'svelte';
	
	const dispatch = createEventDispatcher();

	const regExpEscape = s =>
		s.replace(/[-\\^$*+?.()|[\]{}]/g, "\\$&");
	const htmlEscape = s =>
		s.replace(/[\u00A0-\u9999<>"&]/gim, i => '&#' + i.charCodeAt(0) + ';');

	/** `id` attribute of the input element. */
	export let id = null;
	/** `name` attribute of the input element. */
	export let name = '';
	/** Currently selected value. See `items` property. */
	export let value = '';
	/** Currently selected key. See `items` property. */
	export let key = '';
	/** Placeholder text. */
	export let placeholder = '';
	/** Whether the input is required. */
	export let required = false;
	/** Whether the input is disabled. */
	export let disabled = false;

	/**
	 * Gets a list of items that can be completed.
	 * Can return a promise to load data asynchronously.
	 * Returning an existing promise if list can be cached is recommended.
	 * 
	 * Items have to be strings or of the form { key: string, value: string }.
	 * The key will be searched in and displayed.
	 * The value represents a technical item value that can be extracted via binding
	 * the `value` property.
	 */
	export let items = () => [];

	/** Whether the item dropdown is opened. */
	export let isOpen = false;
	/** Items matching the search. */
	export let results = [];
	/** The search string. */
	export let search = '';
	/** Whether the datasource is currently loading. */
	export let isLoading = false;
	/** Currently highlighted list item index. */
	export let cursor = 0;
	/** Currently highlighted list item. */
	export let cursorItem;
	/** Maximum number of items to show in list at a time. */
	export let maxItems = undefined;
	/** Whether the search string has to appear at the start of the item. */
	export let fromStart = true;
	/** Whether the search is case sensitive. */
	export let caseSensitive = false;
	/** Class to apply to the input element. */
	export let className = '';
	/** Minimum number of characters required to trigger a search. */
	export let minChar = 0;
	/** Time to wait in milliseconds before triggering a search. */
	export let debounce = 0;

	/**
	 * Whether the DOM elements for the list are only created
	 * upon filtering/opening the suggestions dropdown.
	 */
	export let lazyDropdown = false;

	/**
	 * Custom search RegEx.
	 * If set, `fromStart` and `caseSensitive` will not be used.
	 * {@type (search: string) => RegExp}
	 */
	export let searchRegEx = null;

	/**
	 * Custom search function.
	 * If set, `fromStart`, `caseSensitive` and `searchRegEx` will not be used.
	 * {@type (search: string) => (text: string) => {
	 *     matches: boolean,
	 *     highlights: [number, number][], // Array of start and end index tuples
	 * }}
	 */
	export let searchFunction = null;

	let input;
	let hasSearched = false;

	let resultListItems = [];

	$: searchFlags = caseSensitive ? '' : 'i';
	$: effectiveSearchRegEx = searchRegEx != null ? searchRegEx
		: fromStart
			? q => RegExp('^' + regExpEscape(q), searchFlags)
			: q => RegExp(regExpEscape(q), searchFlags);
	$: effectiveSearchFunction = searchFunction != null
		? searchFunction : defaultSearch;

	$: if (cursor > results.length - 1)
		cursor = Math.max(0, results.length - 1);
	
	$: if (search.length >= minChar) {
		const matcher = effectiveSearchFunction(search);

		resultListItems = results
			.map(item => {
				const text = typeof item !== 'string' ? item.key : item;
				
				const { matches, highlights } = matcher(text);

				let lastHighlightEnd = 0;
				const parts = []
				for (const [start, end] of highlights) {
					const head = text.substring(lastHighlightEnd, start);
					const highlightText = text.substring(start, end);
					const highlightClass = 'autocomplete-result-match';
					const highlight = `<span class=${highlightClass}>${htmlEscape(highlightText)}</span>`;

					parts.push(htmlEscape(head), highlight);
					lastHighlightEnd = end;
				}
				
				const tail = text.substring(lastHighlightEnd);
				parts.push(htmlEscape(tail));

				return {
					key: text,
					value: item.value || item,
					label: parts.join(''),
				};
			});
	}

	$: cursorItem = results[cursor];

	let debounceHandle = undefined;

	onDestroy(() => clearTimeout(debounceHandle));

	const defaultSearch = query => {
		const regex = effectiveSearchRegEx(query);

		return text => {
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
	
	function onInput() {
		queueQuery();
	}

	function queueQuery() {
		if (search.length >= minChar) {
			clearTimeout(debounceHandle);
			debounceHandle = setTimeout(runQuery, debounce);
		}
	}

	async function runQuery() {
		open();
		isLoading = true;
		await filterResults(search);
		isLoading = false;
	}

	async function filterResults(search) {
		hasSearched = true;
		const searchText = search.toUpperCase();
		const loadedItems = await items();
		
		const matcher = effectiveSearchFunction(search);

		results = loadedItems.filter(item => {
			if (typeof item !== 'string') {
				item = item.key || '' // Silent fail
			}

			return matcher(item).matches;
		})
		.slice(0, maxItems);
	}

	function onKeyDown(event) {
		switch (event.key)
		{
			case 'ArrowDown':
				event.preventDefault();
				if (cursor < results.length - 1)
					cursor =  cursor + 1;
				break;

			case 'ArrowUp':
				event.preventDefault();
				if (cursor > 0)
					cursor =  cursor - 1;
				break;

			case 'Enter':
				event.preventDefault()
				if (cursor === -1) {
					cursor = 0;
				}
				select(cursor);
				break;

			case 'Escape':
				event.preventDefault()
				close();
				break;
		}
	}

	function onFocus(event) {
		activate();

		dispatch(event.type, event);
	}

	function onBlur(event) {
		isOpen = false;

		dispatch(event.type, event);
	}

	function onClick(event) {
		activate();

		dispatch(event.type, event);
	}

	function activate() {
		if (search.length >= minChar)
			open();

		if (hasSearched == false)
			queueQuery();
	}

	function onItemClick(event, index) {
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
</script>

<style>
	:global(:root) {
		--ac-input-color: black;
		--ac-input-background: white;
		--ac-input-border: none;
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

	input {
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

	.autocomplete {
		position: relative;
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

	.autocomplete-result.is-active {
		color: var(--ac-result-highlighted-color, var(--ac-result-color));
		background: var(--ac-result-highlighted-background, var(--ac-result-background));
		border: var(--ac-result-highlighted-border, var(--ac-result-border));
		margin: var(--ac-result-highlighted-margin, var(--ac-result-margin));
		padding: var(--ac-result-highlighted-padding, var(--ac-result-padding));
		border-radius: var(--ac-result-highlighted-border-radius, var(--ac-result-border-radius));
	}

	.autocomplete-result > :global(.autocomplete-result-match) {
		color: var(--ac-result-match-color);
		background: var(--ac-result-match-background);
		font-weight: var(--ac-result-match-font-weight);
		font-style: var(--ac-result-match-font-style);
		border-radius: var(--ac-result-match-border-radius);
	}
</style>

<svelte:window on:click="{() => close()}" />

<div class="autocomplete"
	on:click="{event => event.stopPropagation()}">
	<input bind:this={input} type="text"
		{id}
		class={className}
		{name}
		{placeholder}
		{required}
		{disabled}
		autocomplete={name}
		bind:value={search}
		on:input={onInput}
		on:focus={onFocus}
		on:blur={onBlur}
		on:click={onClick}
		on:keydown={onKeyDown}>

	{#if lazyDropdown == false || isOpen}
		<div class="autocomplete-results-dropdown"
			class:hidden={!isOpen}>
			{#if isLoading}
				<div class="autocomplete-loading">
					<slot>Loading data...</slot>
				</div>
			{/if}

			<ul class="autocomplete-results-list">
				{#each resultListItems as result, i}
					<li on:mousedown={e => onItemClick(e, i)}
						class="autocomplete-result"
						class:is-active={i === cursor}
						on:mousemove={() => cursor = i}>
						{@html result.label}
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>