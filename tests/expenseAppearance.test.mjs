import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inferExpense, expenseAppearance } from '../lib/expenseAppearance.mjs';
for (const [description, category, icon] of [
  ['Car Rental', 'transport', 'car'], ['Train tickets to Lisbon','transport','train'],
  ['Bus ticket','transport','bus'], ['Flights','transport','plane'], ['Flight to Cairo','transport','plane'],
  ['Supermarket','food','groceries'], ['Coffee','food','coffee'], ['Hotel','lodging','lodging'],
  ['Dinner','food','food'], ['Souvenir','shopping','shopping'], ['Museum tickets','activity','activity'],
  ['', 'other','tag'], ['Training session','other','tag'],
]) test(description || 'empty description', () => assert.deepEqual([inferExpense(description).category,inferExpense(description).icon],[category,icon]));
test('legacy expense gets recognizable icon',()=>assert.equal(expenseAppearance('Car Rental','other').icon,'car'));
test('explicit different category wins',()=>assert.equal(expenseAppearance('Car Rental','shopping').icon,'shopping'));
test('transport distinguishes train from car',()=>assert.equal(expenseAppearance('Train ticket','transport').icon,'train'));
test('four group navigation items always rendered',()=>{
  const page=readFileSync(new URL('../app/trip/[id]/page.js',import.meta.url),'utf8');
  const nav=page.match(/<nav className="mobile-bottom-nav trip-bottom-nav"[\s\S]*?<\/nav>/)[0];
  assert.equal((nav.match(/<button/g)||[]).length,4);
  assert.match(nav, /expenseOnly \? router.push\("\/"\) : switchTab\("plan"\)/);
  assert.doesNotMatch(nav,/!expenseOnly && \(/);
});
