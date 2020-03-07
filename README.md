# Autocomplete Component

An autocomplete component which can be used as a regular ES module import or as a [*Svelte*][svelte] component.

It has no dependencies, handles synchronous and asynchronous data sources and escapes any HTML automatically.

## Usage

In a *Svelte* project the component can be imported in a `<script>` section and then used in the HTML like any other:

```html
<script>
	// (Named import!)
	import { AutoComplete } from '@brunnerh/autocomplete';

	const items = ['Apple', 'Orange', 'Pear'];
</script>

<AutoComplete items={() => items}/>
```

In any other type of project, the component can be instantiated in the script:

```html
<div id="autocomplete-target"></div>

<script type="module">
	import { AutoComplete } from '@brunnerh/autocomplete';

	const items = ['Apple', 'Orange', 'Pear'];
	new AutoComplete({
		target: document.querySelector('#autocomplete-target'),
		props: { items: () => items },
	});
</script>
```

For documentation of how to interact with component instances see [Client-side component API][client-side-api] in the *Svelte* docs.

### Properties

| Prop               | Type                                | Default     | Description |
|--------------------|-------------------------------------|-------------|-------------|
| `id`               | `string | null`                     | `null`      | Sets the `id` of the input element. |
| `name`             | `string | null`                     | `null`      | Sets the `name` of the input element. |
| `className`        | `string`                            | `''`        | Sets additional class name/names of the input element (should be space separated). |
| `placeholder`      | `string | null`                     | `null`      | Sets the `placeholder` of the input element. |
| `title`            | `string | null`                     | `null`      | Sets the `title` of the input element. |
| `required`         | `boolean`                           | `false`     | Sets the `required` attribute on the input element if `true`. |
| `disabled`         | `boolean`                           | `false`     | Sets the `disabled` attribute on the input element if `true`. |
| `autoScroll`       | `boolean`                           | `true`      | Automatically scrolls the component into view.<br/>Can be helpful if the component is at the bottom a scrollable area and the dropdown ends up off-screen. |
| `autoScrollCursor` | `boolean`                           | `true`      | Automatically scrolls to the cursor position in the list.<br/>Turn off if there are performance issues. |
| `items`            | `() => Item[]`                      |             | Sets the suggestions. See [Items Property](#items-property). |
| `isOpen`           | `boolean`                           | `false`     | Gets or sets whether the suggestions dropdown is open. |
| `key`              | `any`                               | `null`      | Gets the last selected key. See [Items Property](#items-property). |
| `value`            | `any`                               | `null`      | Gets the last selected value. See [Items Property](#items-property). |
| `results`          | `any[]`                             | `[]`        | Gets the subset of `items` that match the user input, reduced to the first `maxItems` items. |
| `search`           | `string`                            | `''`        | Gets or sets the current search term/input value. |
| `isLoading`        | `boolean`                           | `false`     | Gets whether the component is currently loading the suggestions (if `items` returns a promise). |
| `cursor`           | `number`                            | `0`         | Gets or sets the index of the currently highlighted item within the suggestions list. |
| `cursorItem`       | `any`                               | `undefined` | Gets the currently highlighted item. |
| `maxItems`         | `number?`                           | `undefined` | Sets the maximal number of items to show in suggestions list at a time. |
| `fromStart`        | `boolean`                           | `false`     | Sets whether the search string has to appear at the start of the item. |
| `caseSensitive`    | `boolean`                           | `false`     | Sets whether the search is case-sensitive. |
| `minChar`          | `number`                            | `0`         | Sets the minimum number of characters required to trigger a search. |
| `debounce`         | `number`                            | `0`         | Sets the time to wait in milliseconds before triggering a search. |
| `blindSelection`   | `boolean`                           | `false`     | Sets whether suggested items are directly selected upon pressing arrow up/down while the dropdown is closed. |
| `lazyDropdown`     | `boolean`                           | `false`     | Whether the DOM elements for the suggestions list are only created upon filtering/opening the suggestions dropdown. |
| `searchRegEx`      | `(search: string) => RegExp | null` | `null`      | Custom search RegEx generator.<br/>If set, `fromStart` and `caseSensitive` will not be used. |
| `searchFunction`   | Search Function                     | `null`      | Custom search function. See [Search Function Property](#search-function-property). |

#### Items Property

The `items` property has to be a function returning a list of items for the auto-completion.

The return value can be a promise to load data asynchronously. Returning an existing promise if the list of suggestions can be cached is recommended. E.g.:

```html
<script>
	// Fetch once:
	const suggestions = fetch('/api/items');
</script>
<AutoComplete items={() => suggestions}/>
```

The items have to be strings or of the form:

```typescript
{
	key: string,
	value?: any,
}
```

The key will be used for the search and displayed in the suggestions dropdown by default.

The `value` represents a technical item value that is assigned to the `value` property of the component upon selection. If no value is set, the whole item will be assigned.

For strings, the string will serve as key and value.

#### Search Function Property

The property `searchFunction` can be used to provide custom search logic when a custom regular expression (`searchRegEx`) is not enough.

The type of the function is as follows:

```typescript
(search: string) => (text: string) => {
	/** Whether the item `text` matches `search`. */
	matches: boolean,
	/**
	 * An array of start and end index tuples for parts of the text that should be highlighted as matching.
	 * Should be an empty array if nothing matches or no highlighting should be shown.
	 */
	highlights: [number, number][],
}
```

If set, `fromStart`, `caseSensitive` and `searchRegEx` will not be used.

### Events

The following events are emitted by the component, event data/forwarded event can be found in the `detail` property:

| Type            | Description  |
|-----------------|--------------|
| `filtered`      | Fired after the suggestion list has been filtered. |
| `item-selected` | Fired upon item selection, either by pressing Enter or clicking on one.<br/>The event data is the selected item. |
| `focus`         | Forwarded from input. |
| `blur`          | Forwarded from input. |
| `input`         | Forwarded from input. |
| `click`         | Forwarded from input. |


### Slots

The following slots can be used in *Svelte* projects:

| Name       | Injected Props    | Description |
|------------|-------------------|-------------|
| `loading`  |                   | The loading indicator that is displayed while items are loading asynchronously.<br/>Default: `Loading data...` |
| `template` | `result`          | A custom template for rendering the items. See [Template](#template) |

#### `template`

By default, items show the item `key` with matching parts of the text highlighted. This slot can be used to customize this output.

The injected `result` prop has the following type:

```typescript
{
	/** The index of the item in the filtered results list (0-based). */
	index: number,

	/** The key of the item. Either the `key` property or the item itself, if it a string. */
	key: string,

	/** The value of the item. Either the `value` property or the whole item. */
	value: any,

	/** An HTML string that contains highlighted parts in spans with the class `ac-match`. */
	label: string,
}
```

Example:

```html
<AutoComplete items={() => data} let:result>
	<!-- Renders item with index prefix and value in parentheses on a second line. -->
	<div slot="template">
		{result.index + 1}: {@html result.label}
		<br/>
		<span style="font-size: smaller; opacity: 0.7">({result.value})</span>
	</div>
</AutoComplete>
```

## Styling

The component comes with a default style and defines various CSS custom properties to make theming easier.

It can also be styled via the classes of the various parts.

### Structure

```
.autocomplete
	input.autocomplete-input
	.autocomplete-results-dropdown
		.autocomplete-loading
		ul.autocomplete-results-list
			li.autocomplete-result[.ac-highlighted]
				span[.ac-match]
```

- `ac-highlighted` is applied to the item highlighted via arrow/up or mouse hover.
- `ac-match` is applied to the parts of the item text that match the search.
  - E.g.: Search: `ap`, item text: `Apple` => `<span class="ac-match">Ap</span>ple`

### CSS Custom Properties

| Target                                | Name                                    | Default Value |
|---------------------------------------|-----------------------------------------|---------------|
| `.autocomplete-input`                 | `--ac-input-color`                      | `black` |
| `.autocomplete-input`                 | `--ac-input-background`                 | `white` |
| `.autocomplete-input`                 | `--ac-input-border`                     | `none` |
| `.autocomplete-input`                 | `--ac-input-border-radius`              | `0` |
| `.autocomplete-input`                 | `--ac-input-padding`                    | `3px` |
| `.autocomplete-input`                 | `--ac-input-margin`                     | `0` |
| `.autocomplete-input`                 | `--ac-input-font-size`                  | `small` |
| `.autocomplete-input`                 | `--ac-input-font-weight`                | `normal` |
| `.autocomplete-results-dropdown`      | `--ac-dropdown-color`                   | Fallback: `--ac-input-color` |
| `.autocomplete-results-dropdown`      | `--ac-dropdown-background`              | Fallback: `--ac-input-background` |
| `.autocomplete-results-dropdown`      | `--ac-dropdown-box-shadow`              | `0px 2px 5px hsla(0, 0%, 0%, 0.7)` |
| `.autocomplete-results-dropdown`      | `--ac-dropdown-margin:`                 | `0` |
| `.autocomplete-results-dropdown`      | `--ac-dropdown-padding:`                | `0` |
| `.autocomplete-results-dropdown`      | `--ac-dropdown-border-radius`           | `0` |
| `.autocomplete-loading`               | `--ac-loading-color`                    | `inherit` |
| `.autocomplete-loading`               | `--ac-loading-background`               | `none` |
| `.autocomplete-loading`               | `--ac-loading-padding`                  | `0` |
| `.autocomplete-loading`               | `--ac-loading-margin`                   | `5px` |
| `.autocomplete-result`                | `--ac-result-color`                     | `inherit` |
| `.autocomplete-result`                | `--ac-result-background`                | `none` |
| `.autocomplete-result`                | `--ac-result-border`                    | `none` |
| `.autocomplete-result`                | `--ac-result-margin`                    | `0` |
| `.autocomplete-result`                | `--ac-result-padding`                   | `0.2em 0.5em` |
| `.autocomplete-result`                | `--ac-result-border-radius`             | `0` |
| `.autocomplete-result.ac-highlighted` | `--ac-result-highlighted-color`         | `inherit` + Fallback: `--ac-result-color` |
| `.autocomplete-result.ac-highlighted` | `--ac-result-highlighted-background`    | `#dbdbdb` + Fallback: `--ac-result-background` |
| `.autocomplete-result.ac-highlighted` | `--ac-result-highlighted-border`        | Fallback: `--ac-result-border` |
| `.autocomplete-result.ac-highlighted` | `--ac-result-highlighted-margin`        | Fallback: `--ac-result-margin` |
| `.autocomplete-result.ac-highlighted` | `--ac-result-highlighted-padding`       | Fallback: `--ac-result-padding` |
| `.autocomplete-result.ac-highlighted` | `--ac-result-highlighted-border-radius` | Fallback: `--ac-result-border-radius` |
| `.autocomplete-result .ac-match`      | `--ac-result-match-color`               | `inherit` |
| `.autocomplete-result .ac-match`      | `--ac-result-match-background`          | `none` |
| `.autocomplete-result .ac-match`      | `--ac-result-match-border-radius`       | `0` |
| `.autocomplete-result .ac-match`      | `--ac-result-match-font-weight`         | `bold` |
| `.autocomplete-result .ac-match`      | `--ac-result-match-font-style`          | `inherit` |

## Attribution

- [patoi/svelte-component-library-template][1] ([License][1l]) - Repo built on template.
- [elcobvg/svelte-autocomplete][2] ([License][2l]) - Original code-base.

 [svelte]: https://svelte.dev/
 [client-side-api]: https://svelte.dev/docs#Client-side_component_API
 [1]: https://github.com/patoi/svelte-component-library-template
 [1l]: https://github.com/patoi/svelte-component-library-template/blob/master/LICENSE
 [2]: https://github.com/elcobvg/svelte-autocomplete
 [2l]: https://github.com/elcobvg/svelte-autocomplete/blob/master/LICENSE