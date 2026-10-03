import test from 'node:test';
import assert from 'node:assert/strict';
import { hasFreeSearches, ratingSearch, mapRatedPlaces, fetchRatedPlaces } from '../lib/explore-ratings.mjs';

test('only a verified free plan with remaining searches is permitted', () => {
  assert.equal(hasFreeSearches({ plan_name: 'Free Plan', plan_monthly_price: 0, plan_searches_left: 250 }), true);
  for (const account of [null, {}, { plan_name: 'Free Plan', plan_monthly_price: 0, plan_searches_left: 0 }, { plan_name: 'Starter', plan_monthly_price: 25, plan_searches_left: 900 }]) {
    assert.equal(hasFreeSearches(account), false);
  }
});
test('equivalent destinations share a canonical search; categories stay separate', () => {
  assert.deepEqual(ratingSearch('coffee', 38.71001, -9.14001, ' LISBON,   Portugal '), ratingSearch('coffee', 38.71002, -9.14002, 'Lisbon, Portugal'));
  assert.notDeepEqual(ratingSearch('coffee', 38.71, -9.14, 'Lisbon'), ratingSearch('restaurants', 38.71, -9.14, 'Lisbon'));
  assert.throws(() => ratingSearch('constructor', 38.71, -9.14, 'Lisbon'));
  assert.throws(() => ratingSearch('coffee', NaN, -9.14, 'Lisbon'));
});
test('preserve genuine ratings, reject invalid numbers and unsafe URLs', () => {
  const base = { place_id: 'test-id', title: 'Test cafe', gps_coordinates: { latitude: 38.7, longitude: -9.1 } };
  const [place, unrated] = mapRatedPlaces({ local_results: [{ ...base, rating: 4.3, reviews: 32 }, { ...base, rating: 8, reviews: -1, thumbnail: 'javascript:alert(1)' }] });
  assert.equal(place.rating, 4.3);
  assert.equal(place.ratingCount, 32);
  assert.ok(place.mapsUrl.includes('query_place_id=test-id'));
  assert.equal(unrated.rating, null);
  assert.equal(unrated.ratingCount, null);
  assert.equal(unrated.photo, '');
  assert.deepEqual(mapRatedPlaces({ local_results: [{ title: 'No position' }] }), []);
});
test('depleted or paid account never performs a search', async () => {
  for (const account of [{ plan_name: 'Free Plan', plan_monthly_price: 0, plan_searches_left: 0 }, { plan_name: 'Starter', plan_monthly_price: 25, plan_searches_left: 250 }]) {
    let calls = 0;
    await assert.rejects(fetchRatedPlaces({ q: 'coffee Lisbon', ll: '@38.7,-9.1,14z' }, 'test-secret', async () => {
      calls++; return { ok: true, json: async () => account };
    }), /Free ratings unavailable/);
    assert.equal(calls, 1);
  }
});
test('one allowed search returns entire list without extra detail calls', async () => {
  const urls = [];
  const results = await fetchRatedPlaces({ q: 'coffee Lisbon', ll: '@38.7,-9.1,14z' }, 'test-secret', async (url) => {
    urls.push(url);
    return { ok: true, json: async () => urls.length === 1 ? { plan_name: 'Free Plan', plan_monthly_price: 0, plan_searches_left: 250 } : { local_results: [] } };
  });
  assert.equal(urls.length, 2);
  assert.equal(urls[0].pathname, '/account.json');
  assert.equal(urls[1].pathname, '/search.json');
  assert.deepEqual(results, []);
});
test('network errors do not expose credentials', async () => {
  await assert.rejects(fetchRatedPlaces({}, 'test-secret', async () => { throw new Error('URL contains test-secret'); }), error => !error.message.includes('test-secret'));
});
