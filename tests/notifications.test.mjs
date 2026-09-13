import assert from 'node:assert/strict';
import {mergeNotifications, markNotificationsRead} from '../lib/notificationState.mjs';
const a = {id:'a',tripId:'one',version:'1',date:'2026-09-12T00:00:00Z'};
const b = {id:'b',tripId:'two',version:'1',date:'2026-09-13T00:00:00Z'};
let result = mergeNotifications(null,[a]);
assert.equal(result.added.length,0); // No flood of historical popups on first use.
assert.equal(result.state.events[0].read,true);
result = mergeNotifications(result.state,[a,b]);
assert.equal(result.added.length,1);
assert.equal(result.state.events.filter(e=>!e.read).length,1);
result = mergeNotifications(result.state,[a,b]);
assert.equal(result.added.length,0); // Realtime/poll duplicates don't increase the count.
let read = markNotificationsRead(result.state,'one');
assert.equal(read.events.find(e=>e.id==='b').read,false);
read = markNotificationsRead(read,'two');
assert.equal(read.events.every(e=>e.read),true);
result = mergeNotifications(JSON.parse(JSON.stringify(read)),[a,{...b,version:'2'}],'2026-09-14T00:00:00Z');
assert.equal(result.added.length,1); // Changed votes count even when their row ID stays the same.
assert.equal(result.added[0].date,'2026-09-14T00:00:00Z');
assert.equal(result.added[0].read,false);
assert.equal(markNotificationsRead(result.state).events.every(e=>e.read),true);
console.log('PASS: initial baseline, new updates, deduplication, group scope, reload persistence, changed votes, mark read');
