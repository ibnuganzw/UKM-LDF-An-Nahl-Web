// Trigram inverted index + Lafzi-style scoring.
//
// Faithful port of go-lafzi's internal/database/token-search.go. Documents are
// phonetic strings; queries are phonetic trigrams. A document is scored by:
//   completeness = matchedTokens / queryTokens   (penalized x0.5 when <= 0.5)
//   compactness  = min(1, 3 / meanGap)            (gaps between token positions)
//   confidence   = completeness * compactness

import { nGramsWithPos, nGrams } from './phoneticCore.mjs';

/**
 * Build a trigram inverted index over phonetic documents.
 *
 * @param {Array<{ id: number, phonetic: string }>} docs  Must be passed in
 *   ascending id order so postings stay globally sorted by (docId, start).
 * @returns {Map<string, Array<{ docId: number, start: number }>>}
 */
export function buildTrigramIndex(docs) {
  const index = new Map();

  for (const doc of docs) {
    const grams = nGramsWithPos(doc.phonetic, 3);
    for (const gram of grams) {
      let postings = index.get(gram.text);
      if (!postings) {
        postings = [];
        index.set(gram.text, postings);
      }
      postings.push({ docId: doc.id, start: gram.start });
    }
  }

  return index;
}

function calcCompleteness(count, expected) {
  let score = count / expected;
  if (score <= 0.5) {
    score *= 0.5;
  }
  return score;
}

function calcCompactness(positions) {
  if (positions.length <= 1) {
    return 1;
  }
  let gapSum = 0;
  for (let i = 1; i < positions.length; i += 1) {
    gapSum += positions[i] - positions[i - 1];
  }
  const gapMean = gapSum / (positions.length - 1);
  if (gapMean === 0) {
    return 1;
  }
  return Math.min(1, 3 / gapMean);
}

/**
 * Search the index for documents matching the phonetic query.
 *
 * @returns {Array<{ docId: number, confidence: number, positions: Array<[number, number]> }>}
 *   sorted by descending confidence, then ascending docId.
 */
export function searchTrigrams(index, phoneticQuery, minConfidence = 0.4) {
  const tokens = nGrams(phoneticQuery, 3);
  const nToken = tokens.length;
  if (nToken === 0) {
    return [];
  }

  // Gather all (docId, start, tokenId) locations for the query trigrams.
  const locations = [];
  for (let tokenId = 0; tokenId < tokens.length; tokenId += 1) {
    const postings = index.get(tokens[tokenId]);
    if (!postings) {
      continue;
    }
    for (const posting of postings) {
      locations.push({ docId: posting.docId, start: posting.start, tokenId });
    }
  }

  if (locations.length === 0) {
    return [];
  }

  // Sort by (docId, start, tokenId).
  locations.sort((a, b) => a.docId - b.docId || a.start - b.start || a.tokenId - b.tokenId);

  // Cluster locations that share a (docId, start): a single document position
  // can satisfy several query tokenIds when the query repeats a trigram (e.g.
  // "la"/"lah" recurring across "allahu la ilaha"). Keep every candidate
  // tokenId per cluster instead of collapsing to the smallest one outright, so
  // the grouping step below can pick whichever candidate keeps an ongoing
  // chain alive.
  const clusters = [];
  for (const loc of locations) {
    const last = clusters[clusters.length - 1];
    if (last && last.docId === loc.docId && last.start === loc.start) {
      last.tokenIds.push(loc.tokenId);
      continue;
    }
    clusters.push({ docId: loc.docId, start: loc.start, tokenIds: [loc.tokenId] });
  }

  // Greedily group locations whose query order (tokenId) is strictly increasing;
  // this approximates the longest in-order subsequence of matching trigrams.
  const groups = [];
  let group = null;

  const closeGroup = () => {
    if (!group) {
      return;
    }
    const completeness = calcCompleteness(group.count, nToken);
    const compactness = calcCompactness(group.positions);
    const confidence = completeness * compactness;
    if (confidence >= minConfidence) {
      groups.push({ docId: group.docId, start: group.start, end: group.end, confidence });
    }
  };

  for (const cluster of clusters) {
    // tokenIds is sorted ascending (locations were sorted by tokenId within a
    // shared start), so this finds the smallest candidate that still extends
    // the current chain, rather than always the smallest overall.
    const continuing = group && cluster.docId === group.docId
      ? cluster.tokenIds.find((tokenId) => tokenId > group.lastTokenId)
      : undefined;

    if (continuing !== undefined) {
      group.count += 1;
      group.end = cluster.start + 3;
      group.lastTokenId = continuing;
      group.positions.push(cluster.start);
    } else {
      closeGroup();
      group = {
        docId: cluster.docId,
        lastTokenId: cluster.tokenIds[0],
        start: cluster.start,
        end: cluster.start + 3,
        count: 1,
        positions: [cluster.start],
      };
    }
  }
  closeGroup();

  if (groups.length === 0) {
    return [];
  }

  // Merge groups per document, keeping the best confidence.
  const byDoc = new Map();
  for (const g of groups) {
    const existing = byDoc.get(g.docId);
    if (!existing) {
      byDoc.set(g.docId, { docId: g.docId, confidence: g.confidence, positions: [[g.start, g.end]] });
    } else {
      existing.confidence = Math.max(existing.confidence, g.confidence);
      existing.positions.push([g.start, g.end]);
    }
  }

  return [...byDoc.values()].sort((a, b) => b.confidence - a.confidence || a.docId - b.docId);
}
