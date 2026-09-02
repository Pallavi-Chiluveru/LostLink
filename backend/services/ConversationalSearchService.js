const Groq = require('groq-sdk');
const FoundItem = require('../models/FoundItem');
const MatchingService = require('./MatchingService');
const { ITEM_ALIASES, normalizeText, containsPhrase } = require('../utils/searchText');

const SEARCH_FIELDS = ['category', 'itemName', 'brand', 'model', 'color', 'location', 'date', 'timeHint', 'description'];
const STAGES = ['COLLECTING_DETAILS', 'SEARCHING', 'MATCHES_SHOWN', 'WAITING_FOR_ACTION'];
const CATEGORIES = [
  'Smartphone', 'Laptop', 'Smartwatch', 'Watch', 'Earphones', 'ID Card', 'Wallet',
  'Keys', 'Bag', 'Books', 'Documents', 'Accessories', 'Clothing', 'Other'
];

const responseSchema = {
  name: 'lostlink_item_search',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['intent', 'extracted', 'clearedFields', 'unknownFields', 'missingImportantFields', 'nextQuestion', 'readyToSearch'],
    properties: {
      intent: {
        type: 'string',
        enum: ['ACKNOWLEDGEMENT', 'NEW_SEARCH', 'REFINE_SEARCH', 'SEARCH_DETAILS']
      },
      extracted: {
        type: 'object',
        additionalProperties: false,
        required: SEARCH_FIELDS,
        properties: Object.fromEntries(SEARCH_FIELDS.map((field) => [field, { type: ['string', 'null'] }]))
      },
      clearedFields: { type: 'array', items: { type: 'string', enum: SEARCH_FIELDS } },
      unknownFields: { type: 'array', items: { type: 'string', enum: SEARCH_FIELDS } },
      missingImportantFields: { type: 'array', items: { type: 'string', enum: SEARCH_FIELDS } },
      nextQuestion: { type: ['string', 'null'] },
      readyToSearch: { type: 'boolean' }
    }
  }
};

function cleanString(value, maxLength = 240) {
  if (typeof value !== 'string') return null;
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return clean ? clean.slice(0, maxLength) : null;
}

function canonicalCategory(value) {
  const clean = cleanString(value, 40);
  if (!clean) return null;
  return CATEGORIES.find((category) => category.toLowerCase() === clean.toLowerCase()) || clean;
}

function sanitizeState(input = {}) {
  const state = {};
  for (const field of SEARCH_FIELDS) {
    const value = field === 'category' ? canonicalCategory(input[field]) : cleanString(input[field]);
    if (value) state[field] = value;
  }
  return state;
}

function sanitizeFieldList(input) {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.filter((field) => SEARCH_FIELDS.includes(field)))];
}

function mergeState(previousState, extracted, clearedFields) {
  const merged = sanitizeState(previousState);
  sanitizeFieldList(clearedFields).forEach((field) => delete merged[field]);
  const cleanExtracted = sanitizeState(extracted);
  return { ...merged, ...cleanExtracted };
}

function normalizeStage(value) {
  return STAGES.includes(value) ? value : 'COLLECTING_DETAILS';
}

function changedSearchFields(previousState, nextState) {
  const previous = sanitizeState(previousState);
  const next = sanitizeState(nextState);
  return SEARCH_FIELDS.filter((field) => (previous[field] || null) !== (next[field] || null));
}

const SIMPLE_ITEM_TYPES = ['smartphone', 'laptop', 'smartwatch', 'watch', 'wallet', 'keys', 'bag', 'books', 'documents', 'accessories', 'clothing'];
const COLORS = ['black', 'blue', 'brown', 'gold', 'gray', 'green', 'grey', 'orange', 'pink', 'purple', 'red', 'silver', 'white', 'yellow'];
const KNOWN_BRANDS = ['reynolds'];

function extractDeterministicDetails(message, previousState = {}) {
  const normalized = normalizeText(message);
  const extracted = {};
  let bestAlias = null;

  for (const group of ITEM_ALIASES) {
    for (const alias of group.aliases) {
      if (containsPhrase(normalized, alias) && (!bestAlias || normalizeText(alias).length > normalizeText(bestAlias.alias).length)) {
        bestAlias = { alias, canonical: group.canonical };
      }
    }
  }

  if (bestAlias) extracted.itemName = bestAlias.canonical;
  if (!extracted.itemName) {
    const simpleType = SIMPLE_ITEM_TYPES.find((item) => containsPhrase(normalized, item));
    if (simpleType) extracted.itemName = simpleType;
  }

  const correction = normalized.match(/\b(?:actually|correction|instead)\b(?: it was| it is| was| is)?(?: my| a| an| the)? (.+)$/);
  if (correction && correction[1] && !/\b(?:block|yesterday|today|tomorrow)\b/.test(correction[1])) {
    extracted.itemName = correction[1];
  }

  const block = normalized.match(/\b([a-z])\s+block\b/);
  if (block) extracted.location = `${block[1].toUpperCase()} Block`;

  const color = COLORS.find((value) => containsPhrase(normalized, value));
  if (color) extracted.color = color;

  const brand = KNOWN_BRANDS.find((value) => containsPhrase(normalized, value));
  if (brand) extracted.brand = brand;

  return mergeState(previousState, extracted, []);
}

function deterministicFields(previousState, nextState) {
  return changedSearchFields(previousState, nextState);
}
function isExplicitNewSearch(message) {
  return /\b(new search|start over|search (?:for )?another item|lost another item)\b/i.test(message);
}

function isSimpleAcknowledgement(message) {
  const normalized = message.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return /^(?:ok(?:ay)?|yes|yeah|yep|fine|cool|alright|got it+|i got it+|yes i got it+|thanks|thank you)$/.test(normalized);
}

function acknowledgementResponse(message) {
  return /\bthank/i.test(message)
    ? "You're welcome! Select a match below whenever you're ready."
    : 'Great! Review the matches below and select the item that looks like yours.';
}

function manualFallbackResponse(input, message = 'AI search is temporarily unavailable. I opened manual search and copied your description so you can keep searching.') {
  return {
    searchState: input.searchState,
    unknownFields: input.unknownFields,
    missingImportantFields: [],
    nextQuestion: null,
    responseMessage: message,
    readyToSearch: false,
    didSearch: false,
    resetSearch: false,
    fallbackToManual: true,
    manualQuery: input.message,
    stage: input.stage,
    totalCount: 0,
    highMatchesCount: 0,
    results: []
  };
}

function isMeaningfulSearch(state, questionCount) {
  const identity = Boolean(state.category || state.itemName);
  const discriminators = ['brand', 'model', 'color', 'location', 'date', 'description']
    .filter((field) => Boolean(state[field])).length;
  return identity && (discriminators >= 2 || (questionCount >= 4 && discriminators >= 1) || questionCount >= 5);
}

function discriminatorCount(state) {
  return ['brand', 'model', 'color', 'location', 'date', 'description']
    .filter((field) => Boolean(state[field])).length;
}

async function findMatches(state) {
  let foundItems;
  try {
    foundItems = await FoundItem.find({ status: 'PENDING' })
      .populate('postedBy', 'name batchYear departmentCode section');
  } catch (error) {
    error.isSearchDatabaseError = true;
    throw error;
  }

  const description = [state.model, state.timeHint, state.description].filter(Boolean).join(' ');
  const criteria = {
    itemName: state.itemName || state.category || '',
    category: state.category || '',
    brand: state.brand || '',
    color: state.color || '',
    description,
    locationFound: state.location || '',
    dateFound: state.date || ''
  };

  return foundItems
    .map((item) => {
      const match = MatchingService.calculateMatch(criteria, item);
      const publicItem = item.toPublicJSON();
      delete publicItem.verificationQuestions;
      if (item.postedBy) {
        publicItem.finderName = item.postedBy.name ? item.postedBy.name.split(' ')[0] : 'Finder';
        delete publicItem.postedBy;
      }
      return { ...publicItem, matchScore: match.score, confidence: match.confidence, reasons: match.reasons };
    })
    .filter((item) => item.matchScore >= 20)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 12);
}

class ConversationalSearchService {
  static validateRequest(body = {}) {
    const message = cleanString(body.message, 1000);
    if (!message) {
      const error = new Error('Please describe the item you lost.');
      error.status = 400;
      throw error;
    }
    return {
      message,
      searchState: sanitizeState(body.searchState),
      stage: normalizeStage(body.stage),
      unknownFields: sanitizeFieldList(body.unknownFields),
      questionCount: Math.min(5, Math.max(0, Number.parseInt(body.questionCount, 10) || 0)),
      conversationContext: Array.isArray(body.conversationContext)
        ? body.conversationContext.slice(-8).map((entry) => ({
            role: entry?.role === 'assistant' ? 'assistant' : 'user',
            content: cleanString(entry?.content, 500)
          })).filter((entry) => entry.content)
        : []
    };
  }

  static async process(rawBody) {
    const input = this.validateRequest(rawBody);

    if (isExplicitNewSearch(input.message)) {
      return {
        searchState: {},
        unknownFields: [],
        missingImportantFields: [],
        nextQuestion: 'What item did you lose?',
        responseMessage: "Let's start a new search. What item did you lose?",
        readyToSearch: false,
        didSearch: false,
        resetSearch: true,
        stage: 'COLLECTING_DETAILS',
        totalCount: 0,
        highMatchesCount: 0,
        results: []
      };
    }

    const matchesAlreadyShown = input.stage === 'MATCHES_SHOWN' || input.stage === 'WAITING_FOR_ACTION';
    if (matchesAlreadyShown && isSimpleAcknowledgement(input.message)) {
      return {
        searchState: input.searchState,
        unknownFields: input.unknownFields,
        missingImportantFields: [],
        nextQuestion: null,
        responseMessage: acknowledgementResponse(input.message),
        readyToSearch: false,
        didSearch: false,
        resetSearch: false,
        stage: 'WAITING_FOR_ACTION',
        totalCount: 0,
        highMatchesCount: 0,
        results: []
      };
    }

    const deterministicState = extractDeterministicDetails(input.message, input.searchState);
    const deterministicChanges = deterministicFields(input.searchState, deterministicState);
    const hasDeterministicIdentity = Boolean(deterministicState.itemName || deterministicState.category);
    if (hasDeterministicIdentity && deterministicChanges.length > 0) {
      const results = await findMatches(deterministicState);
      return {
        searchState: deterministicState,
        unknownFields: input.unknownFields.filter((field) => !deterministicState[field]),
        missingImportantFields: [],
        nextQuestion: null,
        responseMessage: null,
        readyToSearch: true,
        didSearch: true,
        resetSearch: false,
        stage: 'MATCHES_SHOWN',
        totalCount: results.length,
        highMatchesCount: results.filter((item) => item.confidence === 'HIGH').length,
        results
      };
    }

    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      return manualFallbackResponse(input);
    }

    const client = new Groq({ apiKey, timeout: 15000, maxRetries: 1 });
    const today = new Date().toISOString().slice(0, 10);
    const systemPrompt = `You are the LostLink Item Search Assistant for a university lost-and-found platform.
Extract searchable attributes from the student's latest message while respecting the accumulated state.
Classify the latest message as ACKNOWLEDGEMENT, NEW_SEARCH, REFINE_SEARCH, or SEARCH_DETAILS. Extract only attributes stated or corrected in the latest message; use null for all other extracted fields. Never copy accumulated values into extracted.
Never invent values. Preserve accumulated values unless the user corrects them. Put explicitly corrected unknown/removed fields in clearedFields. Put fields the user says they do not know in unknownFields and never ask for those again.
Ask exactly one concise useful follow-up question at a time, chosen for this item type. Never repeat known or unknown fields. Usually finish in 2-5 questions. If category/item identity and at least two useful discriminators are known, set readyToSearch=true and nextQuestion=null.
Normalize category to one of: ${CATEGORIES.join(', ')}. Resolve relative dates to YYYY-MM-DD using today=${today}. Keep time words such as afternoon in timeHint.
Never request, infer, mention, or reveal ownership-verification secrets. Return only the required structured object.`;

    let completion;
    try {
      completion = await client.chat.completions.create({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: systemPrompt },
          ...input.conversationContext,
          {
            role: 'user',
            content: JSON.stringify({
              latestMessage: input.message,
              accumulatedSearchState: input.searchState,
              conversationStage: input.stage,
              fieldsUserDoesNotKnow: input.unknownFields,
              followUpQuestionsAlreadyAsked: input.questionCount
            })
          }
        ],
        response_format: { type: 'json_schema', json_schema: responseSchema },
        temperature: 0.1,
        max_completion_tokens: 700
      });
    } catch (error) {
      console.error('AI Item Finder provider error:', {
        status: error?.status,
        code: error?.error?.error?.code || error?.error?.code,
        type: error?.error?.error?.type || error?.error?.type,
        message: error?.message,
        providerError: error?.error?.error?.message || error?.error?.message
      });
      const message = error?.status === 429
        ? 'AI search is busy right now. I opened manual search so you can continue immediately.'
        : undefined;
      return manualFallbackResponse(input, message);
    }

    let parsed;
    try {
      parsed = JSON.parse(completion.choices?.[0]?.message?.content || '');
    } catch {
      console.error('AI Item Finder response parsing error:', {
        model: completion?.model,
        finishReason: completion?.choices?.[0]?.finish_reason,
        contentPresent: Boolean(completion?.choices?.[0]?.message?.content),
        completionTokens: completion?.usage?.completion_tokens
      });
      const error = new Error('AI search returned an invalid response. Please try again.');
      error.status = 502;
      throw error;
    }

    if (!parsed?.extracted || !Array.isArray(parsed.missingImportantFields)) {
      const error = new Error('AI search returned an invalid response. Please try again.');
      error.status = 502;
      throw error;
    }

    if (parsed.intent === 'NEW_SEARCH') {
      return {
        searchState: {},
        unknownFields: [],
        missingImportantFields: [],
        nextQuestion: 'What item did you lose?',
        responseMessage: "Let's start a new search. What item did you lose?",
        readyToSearch: false,
        didSearch: false,
        resetSearch: true,
        stage: 'COLLECTING_DETAILS',
        totalCount: 0,
        highMatchesCount: 0,
        results: []
      };
    }

    if (matchesAlreadyShown && parsed.intent === 'ACKNOWLEDGEMENT') {
      return {
        searchState: input.searchState,
        unknownFields: input.unknownFields,
        missingImportantFields: [],
        nextQuestion: null,
        responseMessage: acknowledgementResponse(input.message),
        readyToSearch: false,
        didSearch: false,
        resetSearch: false,
        stage: 'WAITING_FOR_ACTION',
        totalCount: 0,
        highMatchesCount: 0,
        results: []
      };
    }

    const searchState = mergeState(input.searchState, parsed.extracted, parsed.clearedFields);
    const changedFields = changedSearchFields(input.searchState, searchState);
    const unknownFields = [...new Set([...input.unknownFields, ...sanitizeFieldList(parsed.unknownFields)])]
      .filter((field) => !searchState[field]);
    const meaningful = isMeaningfulSearch(searchState, input.questionCount);
    const hasChangedAttributes = changedFields.length > 0;
    const criteriaAreReady = meaningful && (
      Boolean(parsed.readyToSearch) || discriminatorCount(searchState) >= 3 || input.questionCount >= 4
    );
    const shouldSearch = criteriaAreReady && (!matchesAlreadyShown || hasChangedAttributes);
    const results = shouldSearch ? await findMatches(searchState) : [];

    if (matchesAlreadyShown && !hasChangedAttributes) {
      return {
        searchState,
        unknownFields,
        missingImportantFields: [],
        nextQuestion: null,
        responseMessage: acknowledgementResponse(input.message),
        readyToSearch: false,
        didSearch: false,
        resetSearch: false,
        stage: 'WAITING_FOR_ACTION',
        totalCount: 0,
        highMatchesCount: 0,
        results: []
      };
    }

    return {
      searchState,
      unknownFields,
      missingImportantFields: sanitizeFieldList(parsed.missingImportantFields).filter((field) => !unknownFields.includes(field)),
      nextQuestion: shouldSearch ? null : cleanString(parsed.nextQuestion, 240),
      responseMessage: null,
      readyToSearch: shouldSearch,
      didSearch: shouldSearch,
      resetSearch: false,
      stage: shouldSearch ? 'MATCHES_SHOWN' : 'COLLECTING_DETAILS',
      totalCount: results.length,
      highMatchesCount: results.filter((item) => item.confidence === 'HIGH').length,
      results
    };
  }
}

module.exports = ConversationalSearchService;
module.exports._test = {
  sanitizeState,
  mergeState,
  isMeaningfulSearch,
  discriminatorCount,
  sanitizeFieldList,
  normalizeStage,
  changedSearchFields,
  isExplicitNewSearch,
  isSimpleAcknowledgement,
  manualFallbackResponse,
  extractDeterministicDetails,
  findMatches
};
