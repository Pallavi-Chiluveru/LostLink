const test = require('node:test');
const assert = require('node:assert/strict');

const ConversationalSearchService = require('../services/ConversationalSearchService');
const {
  changedSearchFields,
  isExplicitNewSearch,
  isSimpleAcknowledgement,
  manualFallbackResponse
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

test('AI outages fall back to manual search without an HTTP error', () => {
  const result = manualFallbackResponse({
    message: 'black Dell laptop near H block',
    searchState: { category: 'Laptop' },
    unknownFields: [],
    stage: 'COLLECTING_DETAILS'
  });

  assert.equal(result.fallbackToManual, true);
  assert.equal(result.manualQuery, 'black Dell laptop near H block');
  assert.equal(result.didSearch, false);
  assert.deepEqual(result.searchState, { category: 'Laptop' });
});

test('search text normalization handles case, separators, punctuation, and aliases', () => {
  const { normalizeText, canonicalItemType } = require('../utils/searchText');
  for (const value of ['ID-Card', 'id card', 'ID CARD', 'Id-Card', '  id   card  ', 'id_card']) {
    assert.equal(normalizeText(value), 'id card');
  }
  for (const value of ['id card', 'student id', 'college id card', 'identity card']) {
    assert.equal(canonicalItemType(value), 'id card');
  }
});

test('deterministic extraction stores simple item answers and retains location across turns', () => {
  const { extractDeterministicDetails } = ConversationalSearchService._test;
  const firstTurn = extractDeterministicDetails('id card', {});
  assert.deepEqual(firstTurn, { itemName: 'id card' });
  const secondTurn = extractDeterministicDetails('H block', firstTurn);
  assert.deepEqual(secondTurn, { itemName: 'id card', location: 'H Block' });
  const combined = extractDeterministicDetails('ID CARD H BLOCK', {});
  assert.deepEqual(combined, { itemName: 'id card', location: 'H Block' });
});

test('simple item input searches PENDING Found Items without Groq', async () => {
  const FoundItem = require('../models/FoundItem');
  const originalFind = FoundItem.find;
  const originalApiKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  const idCard = {
    itemName: 'ID-Card', category: 'ID Card', brand: '', color: 'White',
    description: 'Anurag University student ID card found in H Block.',
    locationFound: 'H Block', dateFound: new Date('2026-08-20'), status: 'PENDING', postedBy: null,
    toPublicJSON() { return { _id: 'id-card-1', itemName: this.itemName, category: this.category, color: this.color, description: this.description, locationFound: this.locationFound, dateFound: this.dateFound, status: this.status }; }
  };
  FoundItem.find = (filter) => {
    assert.deepEqual(filter, { status: 'PENDING' });
    return { populate: async () => [idCard] };
  };

  try {
    for (const message of ['id card', 'ID CARD', 'Id Card', 'id-card', 'student id', 'college id card']) {
      const result = await ConversationalSearchService.process({ message });
      assert.equal(result.resetSearch, false);
      assert.equal(result.didSearch, true);
      assert.equal(result.searchState.itemName, 'id card');
      assert.equal(result.results[0].itemName, 'ID-Card');
    }
  } finally {
    FoundItem.find = originalFind;
    if (originalApiKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalApiKey;
  }
});

test('pen is extracted and a completed empty search does not restart the conversation', async () => {
  const FoundItem = require('../models/FoundItem');
  const originalFind = FoundItem.find;
  const originalApiKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  FoundItem.find = (filter) => {
    assert.deepEqual(filter, { status: 'PENDING' });
    return { populate: async () => [] };
  };

  try {
    const result = await ConversationalSearchService.process({ message: 'pen' });
    assert.equal(result.searchState.itemName, 'pen');
    assert.equal(result.didSearch, true);
    assert.equal(result.resetSearch, false);
    assert.equal(result.totalCount, 0);
    assert.equal(result.nextQuestion, null);
  } finally {
    FoundItem.find = originalFind;
    if (originalApiKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalApiKey;
  }
});

test('deterministic extraction captures color, brand, and block location for a pen', () => {
  const { extractDeterministicDetails } = ConversationalSearchService._test;
  assert.deepEqual(extractDeterministicDetails('blue pen', {}), { itemName: 'pen', color: 'blue' });
  assert.deepEqual(extractDeterministicDetails('I lost a black pen near B Block', {}), {
    itemName: 'pen', color: 'black', location: 'B Block'
  });
  assert.deepEqual(extractDeterministicDetails('I lost a blue Reynolds pen near B Block', {}), {
    itemName: 'pen', brand: 'reynolds', color: 'blue', location: 'B Block'
  });
});

test('pen search returns a real matching pending item', async () => {
  const FoundItem = require('../models/FoundItem');
  const originalFind = FoundItem.find;
  const pen = {
    itemName: 'Ballpoint Pen', category: 'Other', brand: 'Reynolds', color: 'Blue',
    description: 'Blue pen', locationFound: 'B Block', status: 'PENDING', postedBy: null,
    toPublicJSON() { return { _id: 'pen-1', itemName: this.itemName, category: this.category, brand: this.brand, color: this.color, description: this.description, locationFound: this.locationFound, status: this.status }; }
  };
  FoundItem.find = () => ({ populate: async () => [pen] });

  try {
    const result = await ConversationalSearchService.process({ message: 'pen' });
    assert.equal(result.totalCount, 1);
    assert.equal(result.results[0]._id, 'pen-1');
    assert.ok(result.results[0].matchScore >= 20);
  } finally {
    FoundItem.find = originalFind;
  }
});
