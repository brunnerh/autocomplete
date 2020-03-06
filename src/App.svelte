<script>
	import AutoComplete from './AutoComplete.svelte';

	const pomes = ["Apple", "Chinese quince", "Chokeberry", "Cocky apple", "Eastern mayhaw", "Hawthorn", "Jagua", "Loquat", "Lovi-lovi", "Medlar", "Niedzwetzky's apple", "Pear", "Quince", "Ramontchi", "Rose hip", "Rowan", "Sapodilla", "Scarlet firethorn", "Serviceberry", "Shipova", "Sorb", "Southern crabapple", "Toyon"];
	const drupes = ["Açaí", "Acerola", "African mango", "African mangosteen", "African oil palm fruit", "Alaskan bunchberry", "Ambarella", "American oil palm fruit", "American plum", "Apricot", "Bambangan", "Beach plum", "Bignay", "Binjai", "Black cherry", "Bolivian mountain coconut", "Brush cherry", "Bush butter fruit", "Canadian bunchberry", "Casimiroa", "Cedar bay cherry", "Changunga", "Cherry", "Cherry elaeagnus", "Cherry of the rio grande", "Chinese date", "Choke cherry", "Cocoplum", "Coconut", "Cornelian cherry", "Country-almond", "Creek plum", "Crowberry", "Curry berry", "Damson", "Date", "Desert quandong", "Emblic", "Emu apple", "Engkala", "Fibrous satinash", "Flatwoods plum", "Gomortega", "Greengage", "Green plum", "Guavaberry", "Gubinge", "Hairless rambutan", "Jambolan", "Jelly palm fruit", "Jocote", "Jujube", "Kelsey plum", "King coconut", "Korlan", "Little gooseberry", "Longan", "Lychee", "Malay rose apple", "Mamey sapote", "Mango", "Maprang", "Marula", "Miracle fruit", "Moriche palm fruit", "Nectarine", "Neem", "Nepali hog plum", "Nutmeg", "Otaheite gooseberry", "Peach", "Peanut butter fruit", "Pequi", "Pigeon plum", "Pili", "Pitanga", "Plum", "Pulasan", "Rambutan", "Red bush apple", "Riberry", "Sageretia", "Saw palmetto fruit", "Sea coconut", "Shoebutton ardisia", "Silver buffaloberry", "Sloe", "Spanish cherry", "Spanish lime", "Tamarind-plum", "Velvet tamarind", "Watery rose apple", "Wax apple", "Wild peach", "Wongi", "Yangmei", "Yellow plum", "Zwetschge"];

	const testData = [
		...pomes,
		...drupes,
		'Tags: <b>bold?</b>',
	].sort();

	const testDataWithValue = testData.map(x => ({
		key: x,
		value: x.toLowerCase()
			.replace(/\W+/g, '-')
			.replace(/(^-|-$)/g, ''),
	}));

	const delayedData = () => new Promise(res => setTimeout(() => res(testData), 1000));

	let dataPromise = null
	const delayedDataCached = () => dataPromise == null
		? dataPromise = new Promise(res => setTimeout(() => res(testData), 1000))
		: dataPromise;

	let initalSearch = 'apple';

	let key = '';
	let value = '';

	let cursor = 0;
	let cursorItem;

	const wholeWordRegex = search => RegExp('\\b' + search + '\\b', 'iu');

	const regExpEscape = s =>
		s.replace(/[-\\^$*+?.()|[\]{}]/g, "\\$&");
		
	const looseSearch = search => {
		const any = '(.*?)';
		const regex = RegExp(
			any +
			search
				.split('')
				.map(regExpEscape)
				.map(c => `(${c})`)
				.join(any) +
			any,
			'i');

		return text => {
			const matches = text.match(regex);
			if (matches == null)
				return { matches: false, highlights: [] };

			let index = 0;
			const highlights = [];
			matches
				.slice(1) // First is whole match
				.forEach((m, i) => {
					if (i % 2 == 1) {
						highlights.push([index, index + m.length])
					}

					index += m.length;
				});

			return {
				matches: highlights.length > 0,
				highlights,
			};
		};
	}
</script>

<style>
	:global(html, body) {
		margin: 0;
		padding: 0;
		width: 100%;
		height: 100%;
		background: #333;
		color: #ddd;
	}

	.root {
		padding: 10px;
	}
	
	.grid {
		display: inline-grid;
		grid-template-columns: max-content minmax(250px, max-content);
		grid-column-gap: 5px;
		grid-row-gap: 7px;
		
		--ac-input-color: #eee;
		--ac-input-background: #444;
		--ac-input-border: none;
		--ac-input-padding: 3px;
		--ac-input-margin: 0;

		--ac-dropdown-color: var(--ac-input-color);
		--ac-dropdown-background: var(--ac-input-background);
		--ac-dropdown-box-shadow: 0px 2px 5px hsla(0, 0%, 100%, 0.2);
		
		--ac-result-match-color: hsl(210, 100%, 74%);
		--ac-result-highlighted-background: #555;
	}

	div[title] {
		border-bottom: 1px dashed #eee;
	}

	.json {
		white-space: pre;
	}

	.theming {
		--color: hsl(60, 94%, 65%);
		--ac-input-color: var(--color);
		--ac-input-background: #444;
		--ac-input-border: none;
		--ac-input-border-radius: 10px;
		--ac-input-padding: 5px 10px;
		--ac-input-margin: 0;

		--ac-dropdown-padding: 5px;
		--ac-dropdown-border-radius: 5px;
		--ac-dropdown-box-shadow: 0px 2px 5px hsla(0, 0%, 100%, 0.2);
		
		--ac-result-margin: 5px 0 0 0;
		--ac-result-match-color: var(--color);
		--ac-result-border: transparent 1px solid;
		--ac-result-highlighted-border: var(--color) 1px solid;
		--ac-result-highlighted-background: none;
		--ac-result-highlighted-border-radius: 10px;
	}
</style>

<div class="root">
	<h1>Autocomplete Component</h1>

	<div class="grid">
		<div>Simple</div>
		<AutoComplete
			items={() => testData}
			fromStart={false}/>

		<div>
			<label for="labeled">Labeled input (click this)</label>
		</div>
		<AutoComplete id="labeled"
			items={() => testData}
			fromStart={false}/>

		<div>From start</div>
		<AutoComplete
			items={() => testData}
			fromStart={true}/>
		
		<div>Case sensitive</div>
		<AutoComplete
			items={() => testData}
			caseSensitive={true}
			fromStart={false}/>
		
		<div title={wholeWordRegex.toString()}>Custom regex (whole word)</div>
		<AutoComplete
			items={() => testData}
			searchRegEx={wholeWordRegex}
			fromStart={false}/>

		<div title={looseSearch.toString()}>Custom search (very loose)</div>
		<AutoComplete
			items={() => testData}
			searchFunction={looseSearch}
			fromStart={false}/>

		<div>Debounced</div>
		<AutoComplete
			items={() => testData}
			debounce={300}
			fromStart={false}/>

		<div>Initial search</div>
		<AutoComplete
			search={initalSearch}
			items={() => testData}
			fromStart={false}/>

		<div>Lazy dropdown DOM</div>
		<AutoComplete
			items={() => testData}
			lazyDropdown={true}
			fromStart={false}/>


		<div>Max items = 10</div>
		<AutoComplete
			items={() => testData}
			maxItems={10}
			fromStart={false}/>

		<div>Min char = 1</div>
		<AutoComplete
			items={() => testData}
			minChar={1}
			fromStart={false}/>

		<div>Item selected event</div>
		<AutoComplete
			items={() => testData}
			on:item-selected={e => alert(e.detail)}
			fromStart={false}/>
			
		<div>Key/value bindings</div>
		<div>
			<div>key: {key}</div>
			<div>value: {value}</div>
			<AutoComplete
				items={() => testDataWithValue}
				bind:key bind:value
				fromStart={false}/>
		</div>

		<div>Cursor and cursor item bindings</div>
		<div>
			<div>cursor: {cursor}</div>
			<div class="json">cursorItem: {JSON.stringify(cursorItem, 0, 4)}</div>
			<AutoComplete
				items={() => testDataWithValue}
				bind:cursor bind:cursorItem
				fromStart={false}/>
		</div>

		<div>Async, cached</div>
		<AutoComplete
			items={delayedDataCached}
			fromStart={false}/>

		<div>Async, uncached, debounced</div>
		<AutoComplete
			items={delayedData}
			debounce={300}
			fromStart={false}/>

		<div>Async, initial search</div>
		<AutoComplete
			search={initalSearch}
			items={delayedData}
			fromStart={false}/>

		<div>Theming</div>
		<div class="theming">
			<AutoComplete
				items={() => testData}
				search={initalSearch}
				fromStart={false}/>
		</div>
	</div>
</div>