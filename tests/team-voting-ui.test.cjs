const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');

test('team details expose a dedicated voting section', () => {
  const source = read('src/matching/team-management/TeamDetailFeature.tsx');
  assert.match(source, /title={`Voting \(\$\{pendingVotes\.length\}\)`}/);
  assert.match(source, /Review profile & vote/);
  assert.match(source, /listTeamProposals\(teamId\)/);
});

test('application notifications open proposal review', () => {
  const source = read('src/matching/team-management/TeamNotificationsFeature.tsx');
  assert.match(source, /Review & vote/);
  assert.match(source, /getProposal\(proposalId\)/);
  assert.match(source, /proposalId: proposal\.id/);
});

test('proposal review shows applicant details before voting', () => {
  const source = read('src/matching/team-management/ProposalReviewFeature.tsx');
  assert.match(source, /Applicant profile/);
  assert.match(source, /proposal\.candidate\?\.bio/);
  assert.match(source, /proposal\.candidate\?\.availability/);
  assert.match(source, /Open GitHub profile/);
  assert.match(source, /SectionHeader title="Voting"/);
});
