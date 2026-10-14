import { AGGREGATE_KEYWORDS, AGGREGATE_WORD_SOURCE, aggregateAbove } from './aggregate.js';
import { TAG_NAME_SRC } from './identifiers.js';

// A tag request line's `sum|average` prefix (`sum #food`).
const TAG_AGGREGATE = new RegExp(`^(${AGGREGATE_WORD_SOURCE})\\s*(of)?$`, 'i');

// A tag request line: bare `#food` sums, and `sum|total|average|avg [#food]`
// (optionally `... of #food`) picks the mode. Returns null when the code is an
// ordinary expression.
function tagAggregateMode(code) {
  const text = code.trim();
  if (text === '') return 'sum';
  const match = TAG_AGGREGATE.exec(text);
  if (!match) return null;
  return AGGREGATE_KEYWORDS[match[1].toLowerCase()];
}

// Combine every tagged value row above the request, using the same unit rules
// as the running total. A row tagged for several people is the item's full
// amount, split equally between them, so each tag gets its share while the row
// itself (and the group total) keeps the full price. Returns null when no row
// carries any of the requested tags.
function tagAggregate(results, tags, toIndex, mode, math) {
  const tagged = results
    .slice(0, toIndex)
    .filter(
      (result) =>
        result &&
        result.type === 'value' &&
        !result.aggregate &&
        Array.isArray(result.tags) &&
        tags.some((tag) => result.tags.includes(tag))
    );
  if (!tagged.length) return null;
  const shares = tagged.map((result) => ({
    type: 'value',
    value: splitShare(result.value, result.tags.length, math),
  }));
  return aggregateAbove(shares, 0, shares.length, mode);
}

// One person's share of a value split `count` ways (a number or a Unit).
function splitShare(value, count, math) {
  if (count <= 1) return value;
  if (typeof value === 'number') return value / count;
  if (value && value.isUnit === true) return math.multiply(value, 1 / count);
  return value;
}

function tagError(tags) {
  return `No values tagged ${tags.map((tag) => `#${tag}`).join(', ')}`;
}

// Rewrite a line whose tags take part in the calculation (`#food * 2`) so each
// `#tag` becomes a scope variable holding the tag's aggregate over the rows
// above. Returns the rewritten text, the values to inject, or an error when a
// tag has no tagged rows.
function substituteTags(parsed, results, index, math) {
  const text = parsed.rawCode + parsed.tail.slice(0, parsed.tail.length - parsed.comment.length);
  const values = {};
  let error = null;

  // A request is an optional `sum|total|average|avg [of]` and a run of adjacent tags;
  // the whole run is one value, computed the way the same request on its own line is,
  // so an operator after it (`sum #food * 2`, `#food #drink * 2`) applies to that value.
  const tagSource = `#${TAG_NAME_SRC}`;
  const request = new RegExp(
    `(?:\\b(sum|total|average|avg)\\b[ \\t]+(?:of[ \\t]+)?)?(${tagSource}(?:[ \\t]+${tagSource})*)`,
    'giu'
  );
  const tagName = new RegExp(`#(${TAG_NAME_SRC})`, 'gu');

  const substituted = text.replace(request, (match, keyword, run) => {
    const mode = keyword ? AGGREGATE_KEYWORDS[keyword.toLowerCase()] : 'sum';
    const tags = [...new Set([...run.matchAll(tagName)].map((found) => found[1]))];
    const name = `__tag_${mode}_${tags.map((tag) => tag.replace(/[^\p{L}\p{N}\p{M}_]/gu, '_')).join('__')}`;
    if (name in values) return name;
    if (error) return match;
    const value = tagAggregate(results, tags, index, mode, math);
    if (value === null) {
      error = tagError(tags);
      return match;
    }
    if (typeof value === 'string') {
      error = value;
      return match;
    }
    values[name] = value;
    return name;
  });

  return { text: substituted, values, error };
}

export { tagAggregate, tagAggregateMode, tagError, substituteTags };
