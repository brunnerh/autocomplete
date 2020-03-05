describe('AutoComplete', () =>
{
	const go = (browser) => browser.url('http://localhost:5000/#/');

	it('exists', async browser =>
	{
		await go(browser);
		await browser.waitForElementVisible('input');
	})
})
