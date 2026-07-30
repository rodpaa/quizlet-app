import studyGuide from './phi2010Test5.md?raw';

function sectionBetween(start, end) {
  const section = studyGuide.split(start)[1] || '';
  return end ? section.split(end)[0] : section;
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const vocabSection = sectionBetween('## Vocab', '## Comprehension Questions');
const cards = [...vocabSection.matchAll(
  /^\s*(\d+)\.\s+(.+?):\s+(.+?)(?=^\s*\d+\.\s+|\s*$)/gms,
)].map((match) => {
  const definition = match[3].trim();
  return {
    id: Number(match[1]),
    term: match[2].trim(),
    definition,
    ...(definition.includes('NEEDS CONFIRMATION') ? { pending: true } : {}),
  };
});

const comprehensionSection = sectionBetween('## Comprehension Questions', '## Arguments');
const comprehensionQuestions = [...comprehensionSection.matchAll(
  /^\s*(\d+)\.\s+Question:\s+(.+?)\n\s+Answer:\s+(.+?)(?=\n\s*\n\s*\d+\.\s+Question:|\s*$)/gms,
)].map((match) => ({
  id: `t5-cq-${match[1]}`,
  prompt: match[2].trim(),
  answer: match[3].trim(),
}));

const argumentSection = sectionBetween('## Arguments');
const argumentsList = argumentSection
  .split(/(?=^### Argument Title:)/gm)
  .filter((block) => block.startsWith('### Argument Title:'))
  .map((block) => {
    const title = block.match(/^### Argument Title:\s*(.+)$/m)?.[1]?.trim();
    const shortTitle = block.match(/^Short Title:\s*(.+)$/m)?.[1]?.trim();
    const source = block.match(/^Source:\s*(.+)$/m)?.[1]?.trim();
    const stepsText = block.split(/^Steps:\s*$/m)[1] || '';
    const steps = [...stepsText.matchAll(/^\s*(\d+)\.\s+(.+)$/gm)].map((match) => ({
      id: `${slug(shortTitle)}-${match[1]}`,
      text: match[2].trim(),
    }));

    return {
      id: slug(shortTitle),
      title,
      shortTitle,
      source,
      builder: !block.includes('NEEDS CONFIRMATION'),
      steps,
    };
  });

export const phi2010Test5 = {
  id: 'phi-2010-test-5',
  title: 'PHI 2010: Test 5',
  description: 'Freedom, moral responsibility, punishment, and the meaning of life',
  subject: 'Philosophy',
  color: '#7c3aed',
  emoji: 'Φ',
  testContext: 'Built from the supplied Test 5 study guide covering freedom of action, free will, determinism, responsibility, punishment, and meaning in life.',
  focusAreas: [
    'Distinguish freedom of action from responsibility-making free will, and compare Frankfurt’s Higher-Order Desire Theory with Wolf’s Sane Deep Self View.',
    'Compare compatibilism, libertarian incompatibilism, and hard incompatibilism; know AO, the Consequence Argument, and Kane’s self-forming actions.',
    'Contrast retributive punishment with Pereboom’s preventive contagion model, then compare Taylor’s subjective account of meaning with Wolf’s projects-of-worth view.',
  ],
  pendingTerms: [
    {
      term: 'State of the World at a Time',
      note: 'The second item in the course definition is blank in the supplied lecture notes and draft guide.',
    },
    {
      term: 'Class argument for pessimism about life’s meaning',
      note: 'The exact premises and classroom formulation were not included in the supplied notes. Taylor’s discussion is retained as context, not substituted as confirmed course wording.',
    },
  ],
  cards,
  comprehensionQuestions,
  arguments: argumentsList,
};
