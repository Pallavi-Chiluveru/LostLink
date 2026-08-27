const test = require('node:test');
const assert = require('node:assert/strict');

const ConversationalSearchService = require('../services/ConversationalSearchService');
const {
  changedSearchFields,
  isExplicitNewSearch,
  isSimpleAcknowledgement
} = ConversationalSearchService._test;

const completedSearch = {
  category: 'Other',
  itemName: 'charger',
  brand: 'chincong',
  location: 'h block'
};

test('acknowledgements after matches do not run another search', async () => {
  for (const message of ['ok', 'yes i got itt', 'thanks']) {
    const result = await ConversationalSearchService.process({
      message,
      searchState: completedSearch,
      stage: 'MATCHES_SHOWN'
    });

    assert.equal(result.didSearch, false);
    assert.equal(result.readyToSearch, false);
    assert.equal(result.stage, 'WAITING_FOR_ACTION');
    assert.deepEqual(result.searchState, completedSearch);
    assert.deepEqual(result.results, []);
  }
});

test('changed search attributes are detected while repeated values are ignored', () => {
  assert.deepEqual(changedSearchFields(completedSearch, completedSearch), []);
  assert.deepEqual(
    changedSearchFields(completedSearch, { ...completedSearch, location: 'c block' }),
    ['location']
  );
});

test('new-search phrases reset the conversation without searching', async () => {
  assert.equal(isExplicitNewSearch('search another item'), true);

  const result = await ConversationalSearchService.process({
    message: 'start over',
    searchState: completedSearch,
    stage: 'MATCHES_SHOWN'
  });

  assert.equal(result.resetSearch, true);
  assert.equal(result.didSearch, false);
  assert.equal(result.stage, 'COLLECTING_DETAILS');
  assert.deepEqual(result.searchState, {});
});

test('acknowledgement detection is narrow and does not swallow refinements', () => {
  assert.equal(isSimpleAcknowledgement('okay'), true);
  assert.equal(isSimpleAcknowledgement('Actually it was found near C block'), false);
  assert.equal(isSimpleAcknowledgement('Brand is Dell'), false);
});
