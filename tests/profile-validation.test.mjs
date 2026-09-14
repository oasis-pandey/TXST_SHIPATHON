import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeProfile, validateProfile } from '../src/users/data/profile-types.ts';

const input = {
  display_name: ' Ada ', bio: ' ', github_url: '', skill_level: '', availability: '',
  discovery_mode: 'both', tech_stack: [' React ', '', 'react', 'TypeScript'],
  interests: [], preferred_roles: [],
};

test('trims text, nulls blank optional fields, and deduplicates tags case-insensitively', () => {
  const result = normalizeProfile(input);
  assert.equal(result.display_name, 'Ada');
  assert.equal(result.bio, null);
  assert.equal(result.github_url, null);
  assert.deepEqual(result.tech_stack, ['React', 'TypeScript']);
  assert.deepEqual(validateProfile(result), {});
});

test('requires a name and enforces discovery options and practical text limits', () => {
  const result = validateProfile(normalizeProfile({ ...input, display_name: ' ', discovery_mode: 'invalid', bio: 'x'.repeat(1001), availability: 'x'.repeat(161) }));
  for (const field of ['display_name', 'discovery_mode', 'bio', 'availability']) assert.ok(result[field]);
});

test('accepts an optional HTTPS GitHub profile URL and rejects misleading or invalid URLs', () => {
  for (const github_url of ['', 'https://github.com/ada', 'https://github.com/ada/']) {
    assert.equal(validateProfile(normalizeProfile({ ...input, github_url })).github_url, undefined);
  }
  for (const github_url of ['github.com/ada', 'http://github.com/ada', 'https://github.com.evil.test/ada', 'https://github.com@evil.test/ada', 'https://github.com/ada/repo', 'https://github.com/']) {
    assert.ok(validateProfile(normalizeProfile({ ...input, github_url })).github_url);
  }
});

test('limits tag counts and lengths without constraining free-text skill or availability values', () => {
  const result = validateProfile(normalizeProfile({ ...input, tech_stack: Array.from({ length: 21 }, (_, i) => `Tech ${i}`), interests: ['x'.repeat(51)], skill_level: 'Learning by building', availability: 'Saturday mornings' }));
  assert.ok(result.tech_stack);
  assert.ok(result.interests);
  assert.equal(result.skill_level, undefined);
  assert.equal(result.availability, undefined);
});
