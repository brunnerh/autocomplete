/** Autocomplete item. */
export type Item = string | KeyValueItem;

/** Key/value-based autocomplete item. */
export interface KeyValueItem
{
	/**
	 * The key by which this item can be found.
	 * Is displayed in the dropdown if no template is defined.
	 */
	key: string;

	/** The underlying value of the item, if any. */
	value?: any;
}

/** Custom search function.  */
export type SearchFunction = (search: string) => (text: string) => SearchFunctionResult;

/** Result of evaluating search function. */
export interface SearchFunctionResult
{
	/** Whether the item `text` matches `search`. */
	matches: boolean;

	/**
	 * An array of start and end index tuples for parts of the text that should be highlighted as matching.
	 * Should be an empty array if nothing matches or no highlighting should be shown.
	 */
	highlights: [number, number][];
}

/** Type of the `result` which can be rejected into the item template. */
export interface ResultListItem
{
	index: number;
	key: string;
	value: any;
	label: string;
}