// Presentation only: the six stored categories remain compatible with the database.
const rules = [
  [/\b(train|rail|railway|metro|subway|tram|eurostar)\b/i, 'transport', 'train', 'Train'],
  [/\b(car|rental|taxi|uber|lyft|fuel|petrol|gasoline|parking)\b/i, 'transport', 'car', 'Car'],
  [/\b(bus|coach|shuttle)\b/i, 'transport', 'bus', 'Bus'],
  [/\b(flights?|airfare|planes?|airlines?)\b/i, 'transport', 'plane', 'Flight'],
  [/\b(groceries|grocery|supermarket)\b/i, 'food', 'groceries', 'Groceries'],
  [/\b(coffee|cafe|café|latte|tea)\b/i, 'food', 'coffee', 'Coffee'],
  [/\b(dinner|lunch|breakfast|restaurant|food|pizza|meal|drinks)\b/i, 'food', 'food', 'Food & drink'],
  [/\b(hotel|hostel|airbnb|accommodation|rent|lodging)\b/i, 'lodging', 'lodging', 'Lodging'],
  [/\b(museum|tour|concert|cinema|tickets?|activity)\b/i, 'activity', 'activity', 'Activity'],
  [/\b(shopping|clothes|souvenirs?|gifts?)\b/i, 'shopping', 'shopping', 'Shopping'],
];
const defaults = { food: 'food', transport: 'car', lodging: 'lodging', activity: 'activity', shopping: 'shopping', other: 'tag' };
export function inferExpense(description = '') {
  const match = rules.find(([pattern]) => pattern.test(description));
  return match ? { category: match[1], icon: match[2], label: match[3] } : { category: 'other', icon: 'tag', label: 'Other' };
}
export function expenseAppearance(description, category = 'other') {
  const inferred = inferExpense(description);
  const stored = Object.hasOwn(defaults, category) ? category : 'other';
  // Recognize legacy uncategorized expenses too, without rewriting financial records.
  if (stored === 'other' || stored === inferred.category) return inferred;
  return { category: stored, icon: defaults[stored], label: stored[0].toUpperCase() + stored.slice(1) };
}
