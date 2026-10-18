/**
 * English is the source text of the app: every key in here becomes part of
 * {@link import('@/i18n').TranslationKey}, so a string that is missing from
 * `ru.ts` — or a call site that asks for a key nobody wrote — fails `tsc`.
 *
 * Conventions:
 * - flat dotted keys, grouped by the screen or component that renders them;
 * - `{placeholders}` are substituted by name;
 * - a countable phrase declares all four CLDR categories (`.one`, `.few`,
 *   `.many`, `.other`) so the plural lookup can never miss.
 *
 * Kickers follow the same language as the rest of the screen. English says
 * the same thing as the Russian, in plain professional language. Product
 * names stay: Arche, Grail, canon, shadow, atom.
 */
export const en = {
  // ─── Shared ────────────────────────────────────────────────────────────────
  'common.close': 'Close',
  'common.cancel': 'Cancel',

  // ─── Tab bar ───────────────────────────────────────────────────────────────
  'tabs.atoms': 'Atoms',
  'tabs.grail': 'Grail',
  'tabs.analysis': 'Analysis',

  // ─── The eight vectors ─────────────────────────────────────────────────────
  'dimension.physical.name': 'Physical',
  'dimension.physical.short': 'Physical',
  'dimension.physical.blurb':
    'The body. Sleep, food and movement are the base of physical resource. How your body feels affects everything else.',
  'dimension.intellect.name': 'Intellect',
  'dimension.intellect.short': 'Intellect',
  'dimension.intellect.blurb':
    'Thinking and knowledge. Read, study, understand and draw conclusions. Knowledge becomes useful when it helps you see tasks more clearly and apply it in practice.',
  'dimension.mind_psyche.name': 'Mind and Mental Health',
  'dimension.mind_psyche.short': 'Mind',
  'dimension.mind_psyche.blurb':
    'Inner state. Calm, a pause, a journal and time without extra load help you keep clarity and recover.',
  'dimension.drive.name': 'Drive',
  'dimension.drive.short': 'Drive',
  'dimension.drive.blurb':
    'Willpower and action. The ability to start a task, especially when you do not want to, and keep moving. Drive is formed through real action.',
  'dimension.craft_career.name': 'Craft & Career',
  'dimension.craft_career.short': 'Craft',
  'dimension.craft_career.blurb':
    'Professional work. Skills, practice, work and growth in a profession. As mastery grows, new opportunities appear for work, income and professional growth.',
  'dimension.wealth.name': 'Wealth',
  'dimension.wealth.short': 'Wealth',
  'dimension.wealth.blurb':
    'Money and resources. The financial side of life, keeping accounts, sufficiency and opportunities. What matters is not how it looks from outside, but knowing what you have and how you use it.',
  'dimension.social.name': 'Social',
  'dimension.social.short': 'Social',
  'dimension.social.blurb':
    'Real-life contact and conversation. Meetings, close bonds and contact with people. Online activity by itself does not replace real-life contact.',
  'dimension.spirit.name': 'Spirit',
  'dimension.spirit.short': 'Spirit',
  'dimension.spirit.blurb':
    'Meaning and values. Knowing what matters to you and why you do what you do. That helps you choose a direction and stay tied to what has meaning for you.',

  // ─── Atomizer screen ───────────────────────────────────────────────────────
  'atomizer.kicker': 'Particle system',
  'atomizer.title': 'Movement is life',
  'atomizer.subtitle': 'Day discipline {today}%  ·  Canon {kept}/{promised}',
  'atomizer.subtitle.past': 'Canon {kept}/{promised}',
  'atomizer.filter.all': 'All',
  'atomizer.empty.sunday': 'Sunday is the method day.',
  'atomizer.history.title': 'Chronicle of the day',
  'atomizer.cta.label': 'Add',
  'atomizer.shadow.label': 'Shadow',
  'atomizer.canon.hint': 'Canon is the law.',
  'atomizer.calendar.today': 'Today',
  'atomizer.calendar.prev': 'Previous week',
  'atomizer.calendar.next': 'Next week',
  'atomizer.dow.1': 'Mon',
  'atomizer.dow.2': 'Tue',
  'atomizer.dow.3': 'Wed',
  'atomizer.dow.4': 'Thu',
  'atomizer.dow.5': 'Fri',
  'atomizer.dow.6': 'Sat',
  'atomizer.dow.7': 'Sun',
  'atomizer.badge.one': '{completed} of {total}',
  'atomizer.badge.few': '{completed} of {total}',
  'atomizer.badge.many': '{completed} of {total}',
  'atomizer.badge.other': '{completed} of {total}',

  'verdict.kicker': 'Chronicle of the day',
  'verdict.score': '{score} of {max}',
  'verdict.discipline': 'Day discipline {value}%',
  'verdict.line.5': 'Excellent work. Keep it up.',
  'verdict.line.4': 'The day is almost whole. One more step and it is a five.',
  'verdict.line.3': 'The middle. The word was not held to the end.',
  'verdict.line.2': 'Less was done than burned.',
  'verdict.line.1': 'The day is gone. Start again tomorrow.',
  'verdict.shadow': 'There was shadow. It is not the main thing.',
  'verdict.empty': 'There were no tasks this day.',
  'verdict.empty.sunday': 'Method day. No canon — the word is already given.',

  // ─── Atom card ─────────────────────────────────────────────────────────────
  'atom.status.pending': 'Atom',
  'atom.status.absorbed': 'Done',
  'atom.status.burned': 'Burned',
  'atom.proof': 'Proof',
  'atom.canon': 'Canon',
  'atom.campaign': 'Goal',
  'atom.deadline': 'Deadline {time}',
  'atom.overdue': 'The deadline has passed',
  'atom.notify.on': 'Signal',
  'atom.signal.body': 'Time to close the atom.',
  'atom.instruction.default':
    'Complete the atom “{title}” fully. No substitute, no postponement, no theatre.',

  // ─── Seed atoms (authored content, not user input) ──────────────────────────
  'seed.physical_morning_mobility.title': 'Morning exercise',
  'seed.physical_morning_mobility.instruction':
    '12 minutes of easy mobility for the spine, hips, and shoulders. Do it without a phone. Measure your pulse before and after.',
  'seed.intellect_deep_read.title': '30 minutes of reading',
  'seed.intellect_deep_read.instruction':
    'Choose one book, article, or other source. Read for 30 minutes without switching to other apps. At the end, write down one conclusion and think where you can apply it today.',
  'seed.mind_journal.title': 'Journal and meditation',
  'seed.mind_journal.instruction':
    'Sit in silence for 8 minutes without a phone. Then write three things in the journal: what is worrying you now, what you can change, and what should stay as it is for now.',
  'seed.drive_cold_start.title': 'First step',
  'seed.drive_cold_start.instruction':
    'Before the main work begins, choose one small thing you have been putting off. Take the first step at once, without drifting and without leaving it for later.',
  'seed.craft_deep_work.title': '90 minutes of deep work',
  'seed.craft_deep_work.instruction':
    'Choose one work or professional task. Spend 90 minutes on it alone: no chats, social feeds, or other tasks. By the end there must be a concrete result: a finished text, a file, a calculation, a sent proposal, or another completed piece of work.',
  'seed.wealth_ledger.title': 'Expense record',
  'seed.wealth_ledger.instruction':
    'At the end of the day, write down every expense from today. Then transfer any amount you chose in advance into savings, or put it toward a debt.',
  'seed.social_outreach.title': 'A message to someone close',
  'seed.social_outreach.instruction':
    'Write or call one person close to you. Ask how they are, and talk for a few minutes without requests, errands, or any other aim.',
  'seed.spirit_gratitude.title': 'Practice of gratitude',
  'seed.spirit_gratitude.instruction':
    'At the end of the day, write three concrete things you are grateful for today. They can be people, events, help, a conversation, a chance, or something simple that made the day better.',
  'seed.spirit_prayer.title': 'Prayer or the rite of the day',
  'seed.spirit_prayer.instruction':
    'A short rite in your tradition. Not for a spirit score — so the word of the day is spoken before sleep.',
  'seed.spirit_silence.title': 'Silence and a check of the day',
  'seed.spirit_silence.instruction':
    'Ten minutes with no feed. What you did, where you lied, what you will mend tomorrow. No prayer, no theatre.',
  'seed.spirit_inquiry.title': 'An honest question to meaning',
  'seed.spirit_inquiry.instruction':
    'One question that has no ready answer today. Write it down. Do not close it with a formula.',
  'seed.spirit_school.title': "The school's maxim",
  'seed.spirit_school.instruction':
    'One maxim of your school. Apply it to the task of the day, not to a mood. Write where you held it and where you did not.',
  'seed.canon_rest.title': 'Rest as a method',
  'seed.canon_rest.instruction':
    'Choose one: go to sleep on time, or leave work entirely for this day. Do not plan work tasks into that time, and let yourself recover properly.',

  'shadow.sheet.kicker': 'Shadow',
  'shadow.sheet.title': 'What took a part of your week',
  'shadow.sheet.subtitle': 'No judgments and no excuses — just record the fact.',
  'shadow.sheet.field': 'Shadow field · 7 days',
  'shadow.sheet.empty': 'Nothing hanging for seven days. If something happens — name it the same day.',
  'shadow.sheet.tally': '{title} · {dates}',
  'shadow.sheet.tally.many': '{title} × {count} · {dates}',
  'shadow.sheet.retract.a11y': 'Remove “{title}”',
  'shadow.octagon.a11y': 'Shadow octagon: share of the weekly norm eaten on each vector',
  'shadow.substance_or_sleep.title': 'Tobacco, alcohol, or a lapse in food or sleep',
  'shadow.substance_or_sleep.hint': 'Physical and mind',
  'shadow.feed_instead_of_contact.title': 'A day in the feed instead of a living contact',
  'shadow.feed_instead_of_contact.hint': 'All eight vectors',
  'shadow.impulse_spend.title': 'Impulse spend or debt “for later”',
  'shadow.impulse_spend.hint': 'Wealth',
  'shadow.broke_word.title': 'Gave your word and burned it',
  'shadow.broke_word.hint': 'Drive and discipline',
  'shadow.spite_or_lie.title': 'Anger, a lie, withdrawal',
  'shadow.spite_or_lie.hint': 'Social and spirit',

  // ─── Task ritual sheet ─────────────────────────────────────────────────────
  'ritual.kicker': 'Ritual',
  'ritual.overdue': 'The deadline has passed. Energy leaks away until midnight.',
  'ritual.absorb': 'Done',
  'ritual.burn': 'Burn',
  'ritual.sealed': 'The day is closed. The chronicle does not rewrite.',

  // ─── Restore modal ─────────────────────────────────────────────────────────
  'restore.kicker': 'Undo',
  'restore.title': 'Reset the mistake',
  'restore.body.absorbed':
    'Bring “{title}” ({dimension}) back after you marked it done by accident? The atom becomes an active ritual of the day again.',
  'restore.body.burned':
    'Bring “{title}” ({dimension}) back after you burned it by accident? The atom becomes an active ritual of the day again.',
  'restore.dismiss': 'Leave it as it is',
  'restore.erase.action': 'Delete',
  'restore.erase.confirm': 'Delete?',
  'restore.erase.body': 'The atom will vanish. It cannot be brought back.',
  'restore.erase.accept': 'Delete',

  // ─── Create atom modal ─────────────────────────────────────────────────────
  'create.title': 'Create an atom',
  'create.field.title': 'Name of the action',
  'create.field.title.placeholder': 'For example: 20 minutes of strength work',
  'create.field.title.error': 'Name the atom. An empty title creates no action.',
  'create.field.deadline': 'Deadline',
  'create.field.date': 'Date',
  'create.field.date.placeholder': 'DD.MM.YYYY',
  'create.field.date.error': 'Need a real date: DD.MM.YYYY.',
  'create.field.date.past': 'A past day is already closed. Set the atom on today or later.',
  'create.field.time': 'Time',
  'create.field.time.placeholder': 'HH:mm',
  'create.field.time.error': 'Write the time as HH:mm, or leave the field empty.',
  'create.field.notify': 'Signal',
  'create.field.notify.hint': 'Arrives at the date and time you wrote.',
  'create.field.notify.needTime': 'To turn the signal on, write a time.',
  'create.field.dimension': 'Vector',
  'create.submit': 'Create an atom',

  // ─── Character ─────────────────────────────────────────────────────────────
  'character.title': 'ARCHITECT',
  'character.subtitle': 'The Architecture of Your Essence | Age: {age}',
  'character.meta.life':
    'Level {level}  ·  harmony {harmony}%  ·  life discipline {life}%',
  'character.meta.shadow': 'Shadow {average}%',
  'character.meta.daily.one':
    'Day discipline {today}%  ·  {completed}/{total} atom',
  'character.meta.daily.few':
    'Day discipline {today}%  ·  {completed}/{total} atoms',
  'character.meta.daily.many':
    'Day discipline {today}%  ·  {completed}/{total} atoms',
  'character.meta.daily.other':
    'Day discipline {today}%  ·  {completed}/{total} atoms',
  'character.summary.peak.daily': 'PEAK OF THE DAY',
  'character.summary.peak.life': 'PEAK',
  'character.summary.peak.shadow': 'SHADOW',
  'character.summary.bottleneck.daily': 'THE DAY IS NOT CLOSED',
  'character.summary.bottleneck.life': 'WEAK POINT',
  'character.summary.bottleneck.shadow': 'NEXT',
  'character.shadow.peak': 'Peak',
  'character.deed.done': 'DONE',
  'character.deed.partial': 'NOT ALL',
  'character.deed.missed': 'NOT DONE',
  'character.imbalance.eyebrow.daily': 'THE DAY IS NOT CLOSED',
  'character.imbalance.eyebrow.life': 'IMBALANCE',
  'character.imbalance.eyebrow.shadow': 'WHAT THE SHADOW CONSUMES',
  'character.imbalance.title.daily': 'The day is not closed yet',
  'character.imbalance.title.life': 'What needs attention now',
  'character.imbalance.title.shadow': 'What the shadow consumes',
  'character.imbalance.body.daily':
    'What you planned to do today is still open. If there is time — finish it today. What is left after the day ends will pass into the next day as unfinished.',
  'character.imbalance.body.life':
    'Some directions are clearly weaker than the others right now. You don’t have to take on everything at once — pick one and give it a little time.',
  'character.imbalance.body.shadow':
    'Start with one shadow that affects you most. Don’t try to fix everything at once: pick one step and repeat it until it becomes a habit.',
  'character.harmony.eyebrow.life': 'THE FIELD HOLDS RHYTHM',
  'character.harmony.title.life': 'Harmony',
  'character.harmony.body.life':
    'The main directions are roughly on one level right now. That comes from ordinary attention to different sides of life. Keep the usual rhythm, and don’t drop what you already keep up.',
  'character.gate.eyebrow': 'CRAFT & CAREER',
  'character.gate.title': 'The {cap}% plateau',
  'character.gate.title.open': 'The path is open',
  'character.gate.body.wall':
    'The vector has hit {cap}%. The same craft, the same role and the same pay will not move the boundary. A confirmed achievement is required.',
  'character.gate.body.wait':
    'Craft is still below {cap}%. The boundary is confirmed only when the scale meets the ceiling.',
  'character.gate.body.open':
    'Every career threshold is cleared. From here the vector grows like the others.',
  'character.gate.open': 'Career boundary',
  'character.gate.open.a11y': 'Open the career boundary',
  'character.gate.modal.body':
    'A labourer who becomes a carpenter breaks the threshold. If he stays a carpenter for years at the same pay and without new skills, he hits it again.',
  'character.gate.cap': 'Now {cap}% · next threshold {next}%',
  'character.gate.cap.open': 'There is no ceiling left.',
  'character.gate.kinds': 'What you break it with',
  'character.gate.placeholder': 'For example: became a carpenter',
  'character.gate.confirm': 'Break the boundary',
  'character.gate.error': 'Name the growth in your own words.',
  'career.kind.role': 'Role',
  'career.kind.pay': 'Pay',
  'career.kind.skill': 'Skill',
  'career.kind.craft': 'Craft',
  'character.cta.label': 'Show',
  'character.cta.a11y': 'Show the Grail card',

  'guide.open.a11y': 'How it works',
  'guide.kicker': 'Arche',
  'guide.title': 'How it works',
  'guide.honesty':
    'Arche is an app about self-discipline, reaching goals, and changing the quality of life. It helps you see not the person you wanted to be, but how you actually live: what you did, where you slipped, which word you kept, and where you stepped back.',
  'guide.intro':
    'The main thing in Arche is honesty with yourself. Not a pretty picture, but the reality of your actions. Used honestly and regularly, it can profoundly improve the quality of your life.\n\nArche shows life through eight vectors: Physical, Intellect, Mind, Drive, Craft and Career, Wealth, Social, Spirit.\n\nThere are three main tabs:\nAtoms — the particular actions that make up your day.\nGrail — the whole picture of your life, your goals and your growth.\nAnalysis — what is happening and what to do about it.\n\nFirst you enter your name, date of birth and drive, and take the survey. It records the starting state of your life. Then the Particle system opens.',
  'guide.day.title': 'The day',
  'guide.day.body':
    'In the Particle system there is the week’s canon — the main rhythm of action. From Monday to Saturday each vector has its slots. Sunday is a day without canon.\n\nYou add your own atoms and the goal’s atoms yourself.\n\nEach atom closes with one of two actions: Done or Burn. If you marked an action by mistake, you can undo it the same day.\n\nA past day is closed. Canon cannot be deleted; the atoms you added can be removed.',
  'guide.life.title': 'Life',
  'guide.life.body':
    'The percent on a vector does not jump because of one task. Once a day it moves a little toward the share of the weekly norm you closed in the last seven days.\n\nThe weekly norm for each vector is three atoms. That is 100% of the week:\none atom ≈ 33%;\ntwo ≈ 67%;\nthree = 100%.\n\nLife does not simply collect points — it slowly moves toward your real share of what got done.\n\nFor example, if the scale already reads 50% and only one atom (33%) was closed in the last seven days, the number drops a little. If all three are closed — it rises a little.\n\nThe step is small. So the state of life changes gradually — by the week and the month, not by one good or bad evening.\n\nCraft and Career and Wealth are linked: practice in one field can support the other a little.\n\nCraft and Career has levels of growth: 50%, 65%, 80%, 95%, and an open path. The next level opens through real change — a role, income, a new skill, a result, or growth in the craft.',
  'guide.shadow.title': 'Shadow',
  'guide.shadow.body':
    'Shadow shows the moments when a habit, an impulse or an emotion takes over your decision.\n\nIf you slip, mark it the same day: substances and sleep, a day in the feed, an impulse purchase, a word you did not keep, anger, a lie, or another habit you want to keep in check.\n\nShadow affects the same weekly norm on its own axes. The feed affects all eight vectors at once.\n\nA word you did not keep takes 10% off discipline while it stays marked. The confession can be removed.',
  'guide.discipline.title': 'Discipline',
  'guide.discipline.body':
    'Discipline shows the share of the things in which you kept your word.\n\nThe first day starts at 50%.',
  'guide.goal.title': 'The goal',
  'guide.goal.body':
    'On the Grail you name the goal and set the term. You choose the main axis and the support.\n\nTo move toward the goal you can use ready methods or create your own atoms.\n\nWhen the goal is created, the steps of achievement open:\nIdea → Inspiration → Plan → Energy → Discipline → Balance → Persistence → Flexibility → Habit → Result.\n\nThe steps go in order. The tenth step closes the goal and adds it to achievements.\n\nA goal can be set aside.',
  'guide.grail.title': 'The Grail',
  'guide.grail.body':
    'The octagon shows your state in three views:\ntoday;\nlife;\nshadow.\n\nHarmony is always counted from the state of life.\n\nBeside it are the talent tree — what you do or used to do, breath for the mind and the spirit, and the Grail card, which you can use to show yourself.',
  'guide.analysis.title': 'Analysis',
  'guide.analysis.body':
    'Analysis gathers cards in three directions: day, life and shadow.\n\nThey show where the strong side is now, where there is room to grow, and what is worth noticing.\n\nAt the bottom is an advisor — it helps turn what you notice into a concrete action.',
  'guide.data.title': 'Data',
  'guide.data.body':
    'All data lives on the phone.\n\nReset burns the atoms you added and the shadow. Life and the name stay.\n\nA full wipe erases all data — the app returns to a state as if it had never been opened.',
  'guide.atoms.title': 'Atoms',
  'guide.atoms.body':
    'An atom is one concrete action. Something you can do and close in a day.\n\nAn atom answers the question: “What am I doing?”\n\nAn atom can belong to a goal or stand on its own — as an action that keeps one of the eight vectors going.\n\nFor example: walk for 30 minutes, do a workout, read a few pages, send a job application, call someone close.',
  'guide.aim.title': 'The goal',
  'guide.aim.body':
    'A goal is the result you want to reach in a set time.\n\nA goal answers the question: “What do I want to reach?”\n\nTo move toward the goal you create atoms — concrete actions you can do today.\n\nFor example:\nGoal: get a new job in 3 months.\nAtom: send one application today.\n\nThe goal sets the direction; the atom turns it into action.',

  // ─── Octagon chart ─────────────────────────────────────────────────────────
  'octagon.a11y': 'Octagon of the essence: core of the day, matrix of life and shadow',
  'octagon.toggle.daily': 'Today',
  'octagon.toggle.daily.a11y': 'Show the core of the day',
  'octagon.toggle.life': 'Life',
  'octagon.toggle.life.a11y': 'Show the matrix of life',
  'octagon.toggle.shadow': 'Shadow',
  'octagon.toggle.shadow.a11y': 'Show the shadow',

  // ─── Analytics screen ──────────────────────────────────────────────────────
  'analytics.kicker': 'Personality map',
  'analytics.title.daily': 'Analysis of the day',
  'analytics.title.life': 'Analysis of life',
  'analytics.title.shadow': 'Analysis of the shadow',
  'analytics.subtitle.daily.one':
    'Day discipline {today}%  ·  {completed}/{total} atom',
  'analytics.subtitle.daily.few':
    'Day discipline {today}%  ·  {completed}/{total} atoms',
  'analytics.subtitle.daily.many':
    'Day discipline {today}%  ·  {completed}/{total} atoms',
  'analytics.subtitle.daily.other':
    'Day discipline {today}%  ·  {completed}/{total} atoms',
  'analytics.subtitle.life':
    'Harmony {harmony}%  ·  average field {average}%  ·  life discipline {life}%',
  'analytics.subtitle.shadow': 'Shadow {average}%',
  'analytics.harmony': 'Harmony: {value}%',
  'analytics.average': 'Shadow {value}%',
  'analytics.discipline': 'Discipline: {value}%',
  'analytics.discipline.today': 'Day discipline: {value}%',
  'analytics.discipline.life': 'Life discipline: {value}%',
  'analytics.section.strengths.daily': 'Strengths',
  'analytics.section.strengths.life': 'Strengths of life',
  'analytics.section.bottlenecks.daily': 'Debts of the day',
  'analytics.section.bottlenecks.life': 'Growth points',
  'analytics.section.shadow': 'Shadow',
  'analytics.section.plan.daily': 'Vector of the day',
  'analytics.section.plan.life': 'Vector of life',
  'analytics.section.plan.shadow': 'Vector of the shadow',
  'analytics.shadow.eyebrow': 'Shadow',
  'analytics.week.title': 'Analysis of the week',
  'analytics.week.empty':
    'There was almost no canon this week — Sunday is for seeing that. Don’t promise Monday more than you can close in six days.',
  'analytics.week.veryLow':
    'This week the word often stayed without a next step. You don’t need to unpack everything. For Monday pick one real task and start there.',
  'analytics.week.low':
    'This week it was hard to keep the agreements with yourself. See which task most often stayed still. On Monday start with that one.',
  'analytics.week.mid':
    'This week went unevenly: some days you kept the word, some days you didn’t. On Monday don’t raise the load — try to do the usual amount more evenly.',
  'analytics.week.high':
    'This week you mostly kept the word and finished what you started. On Monday don’t add extra — keep the rhythm that already fits.',
  'analytics.week.veryHigh':
    'This week the word mostly matched what was done. On Monday you don’t need to take on more — stay in the same rhythm.',
  'analytics.week.shadow':
    'There were moments this week when habits or impulses took over: extra food, smoking, an endless feed, a flash of anger, or something else you’d rather keep in check. That doesn’t cancel the rest of what got done. On Monday just notice one such moment — don’t try to fix everything at once.',
  'analytics.life.veryLow.physical':
    'There’s little physical resource right now, and the body needs more activity. Start small: walk a bit and give yourself time to come back into shape.',
  'analytics.life.low.physical':
    'The body is short of resource. It may be sleep, movement, or recovery. Add a little movement to the usual day and see how you feel.',
  'analytics.life.mid.physical':
    'Physical state is even enough, even if energy is not always plenty. Keep the usual rhythm and don’t forget about rest.',
  'analytics.life.high.physical':
    'There’s enough physical resource, and the body handles ordinary load well. Keep the usual rhythm and let yourself recover properly.',
  'analytics.life.veryHigh.physical':
    'You’re in very good physical shape: there’s enough strength, and the body handles the load well. Keep the usual rhythm and give yourself enough time to recover.',
  'analytics.life.veryLow.intellect':
    'It’s hard to hold attention: thoughts can’t stand together, and there’s too much information. Pick one thing and work through it calmly to the end.',
  'analytics.life.low.intellect':
    'Attention switches fast, so it’s hard to go deeper. Take one task and don’t move to the next until you’ve done at least part of it.',
  'analytics.life.mid.intellect':
    'It isn’t always easy to stay with one thing for long. It’s better to finish one important piece than to pick up several new ones.',
  'analytics.life.high.intellect':
    'It’s going well: you can focus and work through something complex. Use that for one task that needs attention.',
  'analytics.life.veryHigh.intellect':
    'Thinking is clear, and attention holds. Take something that actually matters and give yourself time to work through it calmly.',
  'analytics.life.veryLow.mind_psyche':
    'There’s a lot of tension inside, and the head won’t stop. Give yourself at least a few minutes without the phone, just quiet.',
  'analytics.life.low.mind_psyche':
    'There’s more unease than calm right now. In the evening put the phone down and give yourself a little time without new information.',
  'analytics.life.mid.mind_psyche':
    'It’s relatively calm inside, but that state is easy to knock. In the evening don’t fill every free minute with tasks — leave a little time just for yourself.',
  'analytics.life.high.mind_psyche':
    'It’s calm enough inside. Don’t overload the evening, and leave a little time for whatever actually settles you.',
  'analytics.life.veryHigh.mind_psyche':
    'It’s calm and steady inside. Don’t try to do anything with that — keep the usual rhythm and don’t overload yourself.',
  'analytics.life.veryLow.drive':
    'Even simple things can feel heavy right now. Pick one small task and start with the very first step — that’s enough.',
  'analytics.life.low.drive':
    'It can be hard to make yourself start. Pick one simple task and try to see it through.',
  'analytics.life.mid.drive':
    'There’s enough energy for ordinary things, but you don’t want to take on too much. Pick one important task and give it time.',
  'analytics.life.high.drive':
    'There’s a good reserve of energy for action. Point it at one task you’ve been putting off.',
  'analytics.life.veryHigh.drive':
    'There’s a lot of energy and a wish to act. Pick what actually matters and put the force there, without scattering it on everything at once.',
  'analytics.life.veryLow.craft_career':
    'There’s little movement in the professional field. If you’re looking for work or a new direction, take one particular step: apply, write to the right person, or update the CV.',
  'analytics.life.low.craft_career':
    'There’s little professional work, or it isn’t showing a result. Pick one direction and take a step in it.',
  'analytics.life.mid.craft_career':
    'The professional field is moving, but not everything is even yet. Focus on one task that could show a visible result.',
  'analytics.life.high.craft_career':
    'The professional field is developing well. Use this stretch to finish an important task or take the next step.',
  'analytics.life.veryHigh.craft_career':
    'A lot is coming together in the professional field. Keep growing in your direction and don’t miss the opportunities that appear.',
  'analytics.life.veryLow.wealth':
    'Money and options may be tight right now, and that takes a lot of attention. Start with one clear step: name what matters most to you here.',
  'analytics.life.low.wealth':
    'There’s little sense of financial steadiness. Work through the one question that bothers you most in this field.',
  'analytics.life.mid.wealth':
    'The money side is even enough, even if full confidence isn’t there. Keep what already works, and build a little more reserve over time.',
  'analytics.life.high.wealth':
    'You have a solid base in money and enough room for your plans. Use that calmly and keep going.',
  'analytics.life.veryHigh.wealth':
    'Means give you a lot of freedom and options right now. Keep that steadiness and use it for what actually matters to you.',
  'analytics.life.veryLow.social':
    'There’s little living contact, even if the chats are full. Write or call one person you actually want to talk to.',
  'analytics.life.low.social':
    'There’s little real contact. Pick one person and call them instead of another thread.',
  'analytics.life.mid.social':
    'There is contact, but not quite enough. It’s better to call or meet someone than to keep messaging.',
  'analytics.life.high.social':
    'People are near, and you can feel it. Don’t put off a talk with someone close if you’ve been meaning to.',
  'analytics.life.veryHigh.social':
    'Contact is in good shape. Keep that tie and make time for living conversation.',
  'analytics.life.veryLow.spirit':
    'It’s hard to see what matters to you, and the day slips into small tasks. In the evening remember one thing you’re grateful for.',
  'analytics.life.low.spirit':
    'Meaning isn’t always there. At the end of the day name one thing that mattered to you.',
  'analytics.life.mid.spirit':
    'The sense is there, but everyday tasks easily bury it. In the evening remember what actually mattered.',
  'analytics.life.high.spirit':
    'You know well what matters to you. At the end of the day name one thing you’re grateful for.',
  'analytics.life.veryHigh.spirit':
    'It’s clear what matters to you. Keep that in view, and don’t forget the specific people and things that are dear to you.',
  'analytics.daily.done.physical':
    'You took good care of the body. That’s enough — just keep the usual rhythm.',
  'analytics.daily.partial.physical':
    'Something for the body is already done. Pick one remaining task and finish it calmly.',
  'analytics.daily.missed.physical':
    'There was almost no time for the body. Start small: walk a little or stretch at home.',
  'analytics.daily.done.intellect':
    'You worked well with attention and thought. Let the head switch off calmly and don’t take on extra.',
  'analytics.daily.partial.intellect':
    'Some of the tasks are closed, but some remain. Pick one thing and work through it calmly to the end.',
  'analytics.daily.missed.intellect':
    'There wasn’t enough attention for these tasks. Pick one small one and sit with it calmly.',
  'analytics.daily.done.mind_psyche':
    'You gave enough attention to how you are. That’s enough — just keep a quiet evening rhythm.',
  'analytics.daily.partial.mind_psyche':
    'There was time for yourself, but something is still open. Pick one thing and give it calm attention.',
  'analytics.daily.missed.mind_psyche':
    'There was almost no time for yourself. Stop for a few minutes and sit without tasks or new information.',
  'analytics.daily.done.drive':
    'You did the thing that needed action. That’s enough — don’t pile new tasks on yourself right away.',
  'analytics.daily.partial.drive':
    'Things moved, but something is still open. Pick one and take the next step.',
  'analytics.daily.missed.drive':
    'It was hard to start. Pick the simplest thing on the list and begin with the first step.',
  'analytics.daily.done.craft_career':
    'Professional work got enough attention. That’s enough — you can end the day calmly.',
  'analytics.daily.partial.craft_career':
    'The professional field moved, but one piece is still open. Take it through to a result.',
  'analytics.daily.missed.craft_career':
    'Professional work didn’t move. Take one step: an application, a message, a draft, or part of a task.',
  'analytics.daily.done.wealth':
    'You paid attention to this side of life. That’s enough — just keep watching what matters to you here.',
  'analytics.daily.partial.wealth':
    'Some of the money questions got sorted, but one is still open. Come back to it before it disappears among the rest.',
  'analytics.daily.missed.wealth':
    'This side of life got no attention. Take five minutes and see what needs it most right now.',
  'analytics.daily.done.social':
    'You made time for people. That’s enough — stay in touch with those who matter to you.',
  'analytics.daily.partial.social':
    'There was contact, but one person still went without attention. Write or call them.',
  'analytics.daily.missed.social':
    'There was almost no living contact. Write or call one person you want to talk to.',
  'analytics.daily.done.spirit':
    'You paid attention to what matters to you. That’s enough — just keep it in the day.',
  'analytics.daily.partial.spirit':
    'You managed to stop and notice what matters, but there’s room for one more small step.',
  'analytics.daily.missed.spirit':
    'What matters was easy to lose among the rest of the day’s tasks.',
  'analytics.shadow.title': 'Shadow of the week',
  'analytics.shadow.body.substance_or_sleep':
    'Don’t try to change everything at once. Pick the one moment that repeats most often, and change only that today.',
  'analytics.shadow.body.feed_instead_of_contact':
    'Put the phone down and reach one person directly. Write or call — a live contact matters more than another hour in the feed.',
  'analytics.shadow.body.impulse_spend':
    'Don’t decide in the heat of the moment. Put the purchase off until tomorrow and in the morning decide again whether you really need it.',
  'analytics.shadow.body.broke_word':
    'Don’t give a new promise to cover the old one. Pick one small action on this task and do it today.',
  'analytics.shadow.body.spite_or_lie':
    'Don’t keep talking on emotion. Take a pause, and when you can speak calmly — tell the person straight what happened.',
  'analytics.shadow.help.substance_or_sleep':
    'Don’t try to change everything at once. Start with the habit that repeats most often.',
  'analytics.shadow.help.feed_instead_of_contact':
    'Put the phone down and reach one person directly.',
  'analytics.shadow.help.impulse_spend':
    'Don’t make money decisions in the heat of the moment. Give yourself until tomorrow.',
  'analytics.shadow.help.broke_word':
    'Don’t give a new promise instead of the old one. Do one small action on it.',
  'analytics.shadow.help.spite_or_lie':
    'If you feel anger — first take a pause, then say straight what happened.',
  'analytics.shadow.empty':
    'This week is quiet. Keep the usual rhythm. If something happens — just mark it the same day and return to your rhythm.',
  'analytics.gate':
    'Career has stalled. The same job, the same role and the same pay will not move it further. You need a real step: a new role, different pay, or a new skill.',

  'analytics.plan.refresh': 'Refresh the vector',
  'analytics.plan.offline': 'Offline text of the model',
  'analytics.plan.busy': 'Reading the snapshot…',

  // ─── Development plan ──────────────────────────────────────────────────────
  'plan.peak.fallback': 'the strong side',
  'plan.weak.fallback': 'the weak spot',
  'plan.daily.step1':
    '“{peak}” is the main thing today. First finish what you already started on this axis, then move to the next task.',
  'plan.daily.step2':
    '“{weak}” needs more attention right now. Do one task on this axis today.',
  'plan.daily.step3':
    'First finish what you already started on “{weak}”. Don’t take on a new task on this axis yet.',
  'plan.life.step1':
    '{foundation} Support “{peak}” with actions: do at least one thing on it every day.',
  'plan.life.step2':
    '“{weak}” needs more attention right now. Give this axis 15–20 minutes before noon and do one task.',
  'plan.life.step3':
    '“{weak}” needs regularity. Three tasks a week is a good rhythm. Keep “{peak}” up with actions, not promises.',
  'plan.life.step3.shadow':
    '“{weak}” needs regularity. Three tasks a week is a good rhythm. Keep “{peak}” up with actions, not promises. There is a shadow worth paying attention to.',
  'plan.shadow.step1':
    'Don’t try to fix everything at once. Pick one shadow and start with it.',
  'plan.shadow.step2':
    'See what you can change today, and take one step.',
  'plan.shadow.step3':
    'After that return to the usual rhythm — you don’t need to make up for one slip with a dozen new promises.',
  'plan.shadow.empty.step1': 'This week is quiet. Keep the usual rhythm.',
  'plan.shadow.empty.step2':
    'If something slips — mark it the same day and look at what happened.',
  'plan.shadow.empty.step3':
    'You don’t need to give yourself new promises. Just keep doing what already works.',

  // ─── Strength foundations, quoted by the lifetime plan ─────────────────────
  'foundation.physical': 'The body gives strength for everything else.',
  'foundation.intellect':
    'A clear head helps you work through tasks and make decisions.',
  'foundation.mind_psyche':
    'A calm state helps you keep balance and carry the load.',
  'foundation.drive': 'An inner impulse helps you start things and move forward.',
  'foundation.craft_career':
    'Professional work gives you a way to grow, to make, and to see the result of your effort.',
  'foundation.wealth':
    'Financial steadiness gives more freedom in everyday life and in your plans.',
  'foundation.social':
    'Close living ties help you feel part of life, not left alone with everything.',
  'foundation.spirit':
    'Knowing what actually matters to you helps you choose a direction and not lose yourself in everyday tasks.',

  // ─── Proof card ────────────────────────────────────────────────────────────
  'proof.who': 'Who are you?',
  'proof.creed.honesty': 'Honesty is your real result.',
  'proof.creed.lie': 'A lie remains only a picture.',
  'proof.share': 'Share',
  'proof.share.a11y': 'Share the card',
  'proof.share.dialog': 'I am the Grail',
  'proof.share.unavailable': 'Sharing is unavailable on this device.',
  'proof.share.failed': 'The card could not be assembled. Try again.',
  'proof.background.pick': 'Set a photo',
  'proof.background.clear': 'Remove background',
  'proof.background.unavailable': 'A photo could not be chosen right now.',
  'proof.achievements': 'Achievements',
  'proof.achievements.empty': 'No entries yet',
  'proof.goal': 'Goal',
  'proof.goal.empty': 'No goal named yet',
  'proof.stage': 'Goal stage',
  'proof.gifts': 'Manifestations',
  'proof.gifts.empty': 'None yet',

  // ─── Settings ──────────────────────────────────────────────────────────────
  'settings.open.a11y': 'Parameters',
  'settings.title': 'Parameters',
  'settings.data.title': 'My data',
  'settings.data.name': 'Name',
  'settings.data.name.placeholder': 'What to call you',
  'settings.data.drive': 'What drives you?',
  'settings.data.drive.placeholder': 'Write it in one line',
  'settings.data.birth': 'Date of birth',
  'settings.data.birth.day': 'DD',
  'settings.data.birth.month': 'MM',
  'settings.data.birth.year': 'YYYY',
  'settings.data.birth.invalid': 'No such date. Check the day, the month and the year.',
  'settings.data.age.one': 'Age: {count} year',
  'settings.data.age.few': 'Age: {count} years',
  'settings.data.age.many': 'Age: {count} years',
  'settings.data.age.other': 'Age: {count} years',
  'settings.account.title': 'Account',
  'settings.account.apple': 'Sign in with Apple',
  'settings.account.google': 'Sign in with Google',
  'settings.account.out': 'Sign out',
  'settings.account.delete': 'Delete account',
  'settings.account.unavailable': 'Sign-in is unavailable right now.',
  'settings.account.failed': 'Sign-in did not go through.',
  'settings.account.delete.title': 'Delete the account on the server?',
  'settings.account.delete.body':
    'The server copy of this progress is erased. What is already on this phone stays until you reset it here.',
  'settings.account.delete.accept': 'Yes, delete the account',
  'access.premium': 'This opens with the subscription.',
  'access.limit': 'The advisor continues tomorrow.',
  'settings.reset.title': 'Data reset',
  'settings.survey.title': 'Life survey',
  'settings.survey.hint':
    'Only honesty with yourself helps you see who you actually want to be. Answer as you see fit. Only you know how honest the answer is.',
  'settings.survey.open': 'Open the survey',
  'settings.survey.progress': 'Base {base}/{baseTotal} · detailed reading {deep}/{deepTotal}',
  'settings.reset.action': 'Reset',
  'settings.reset.confirm.title': 'Burn the daily field and the atoms you added?',
  'settings.reset.confirm.body':
    'The atoms you added leave the desk, including those set for later days and those that belong to the goal. The canon of the week stays. Shadow of the field is wiped. Language, name, date, drive, the goal itself, signals, survey and the life field stay.',
  'settings.reset.confirm.accept': 'Yes, burn them',
  'settings.reset.confirm.dismiss': 'Leave it as it is',
  'settings.reset.all.action': 'Reset all data',
  'settings.reset.all.confirm.kicker': 'First opening',
  'settings.reset.all.confirm.title': 'Erase this life as if the app had never been opened?',
  'settings.reset.all.confirm.body':
    'Everything goes: name, date of birth, drive, survey, the life octagon, talents, achievements, the goal and its atoms, the desk, the canon of the week, shadow, signals, the advisor, the life vector, the discipline tree, breath and sound. The corridor of the first hour opens again. This cannot be brought back.',
  'settings.reset.all.confirm.accept': 'Yes, erase everything',

  'settings.signals.title': 'Signal',
  'settings.signals.master.a11y': 'Turns all signals on and off',
  'settings.signals.hint': 'Turns all signals on and off',
  'settings.signals.daily.title': 'Daily signal',
  'settings.signals.daily.a11y': 'Turns the daily signal on and off',
  'settings.signals.item.hint': 'Your signal as a reminder',
  'settings.signals.on': 'On',
  'settings.signals.off': 'Off',
  'settings.signals.add': 'Add a signal',
  'settings.signals.remove': 'Remove',
  'settings.signals.date': 'Date',
  'settings.signals.time': 'Time',
  'settings.signals.note': 'Description',
  'settings.signals.note.placeholder': 'Briefly, what to remind you of',
  'settings.signals.date.error': 'Need a real date: DD.MM.YYYY.',
  'settings.signals.time.error': 'Write the time as HH:mm.',
  'settings.signals.past': 'That time has already passed — this signal will not fire.',
  'settings.signals.denied':
    'The phone refused notification permission. Turn it on in system settings.',

  'settings.sound.title': 'Sound',

  'signal.channel': 'Signal',
  'signal.title': 'Signal',
  'signal.body': 'The time you set.',

  'review.title': 'Method of the week',
  'review.col.metric': 'Metric',
  'review.col.was': 'Was',
  'review.col.became': 'Became',
  'review.row.life': 'Life discipline',
  'review.row.shadow': 'Shadow',
  'review.goal.none': 'No goal set.',
  'review.goal.left': 'Goal: {title}\nleft: {months} mo. {days} d.',

  'character.campaign.kicker': 'Goal',
  'character.campaign.empty': 'Add a goal',
  'character.campaign.open': 'Open the goal',

  'talent.title': 'Talent tree',
  'talent.open.a11y': 'Open the talent tree',
  'talent.add': 'Add',
  'talent.save': 'Save',
  'talent.remove': 'Remove talent',
  'talent.placeholder': 'What you do or used to do',
  'talent.vector.physical':
    'Body and sport. Running, the gym, martial arts, dance — what you do with the body.',
  'talent.vector.intellect':
    'Study and knowledge. Languages, books, courses — what you learn with the mind.',
  'talent.vector.mind_psyche':
    'Inner work. Meditation, a journal, something quiet — so the mind stays together.',
  'talent.vector.drive':
    'Will. What you start when you don’t want to, and see through.',
  'talent.vector.craft_career':
    'Craft and profession. Work, a skill, something you can create and show.',
  'talent.vector.wealth':
    'Money. Earning, keeping accounts, how you count and grow what you have.',
  'talent.vector.social':
    'People. A team, a stage, a living conversation — not the feed.',
  'talent.vector.spirit':
    'Meaning. Faith, service, practice — why you do this.',
  'talent.cap': 'This week the vector already took its share from the tree. The branch still grows; the scale waits.',
  'talent.error': 'Name the skill in your own words.',
  'talent.full': 'This vector’s branch is full.',

  'breath.title': 'Breath',
  'breath.hint':
    'A place to recover a little. After three minutes the spirit and the mind grow a bit stronger. For a clearer result, gradually stretch the sitting to 15–20 minutes.',
  'breath.open.a11y': 'Open the breath practice',
  'breath.phase.inhale': 'Inhale',
  'breath.phase.hold': 'Hold',
  'breath.phase.exhale': 'Exhale',
  'breath.phase.prep': 'Prepare',
  'breath.phase.beat': '{label} {second}',
  'breath.award': 'Spirit and the mind grew a little stronger.',

  'discipline.title': 'Steps to the goal',
  'discipline.open.a11y': 'Open the steps to the goal',
  'discipline.locked.needGoal': 'To get access, you need to create a goal.',
  'discipline.locked.cta': 'Create a goal',
  'discipline.body':
    'This method takes any idea all the way to a result. Ten steps lead from the idea to its embodiment — one stage at a time, without hurry and without theatre.',
  'discipline.mark': 'Mark this stage complete',
  'discipline.unmark': 'Remove the mark',
  'discipline.unmark.hint': 'Later steps will be undone too.',
  'discipline.locked': 'Still closed. Complete the previous stage first.',
  'discipline.done': 'Passed.',
  'discipline.victory': 'The goal is reached. The tree shines.',
  'discipline.victory.moved': 'The goal is written into Achievements.',
  'discipline.need': 'To complete:',
  'discipline.step.1.title': 'Idea',
  'discipline.step.1.body':
    'The centre of meaning. This is where the answer is born: why do I need this. Not just a task — an intention to change life for the better.',
  'discipline.step.1.need': 'The core value of the goal is named.',
  'discipline.step.2.title': 'Inspiration',
  'discipline.step.2.body':
    'The first spark. The moment the end is already visible. A clean “I want”, not yet bound by limits or rules.',
  'discipline.step.2.need': 'An image of the desired result is written down.',
  'discipline.step.3.title': 'Plan',
  'discipline.step.3.body':
    'The architecture of action. Feeling becomes steps, dates and an order of work.',
  'discipline.step.3.need': 'The goal is broken into concrete tasks and deadlines.',
  'discipline.step.4.title': 'Energy',
  'discipline.step.4.body':
    'Fuel for the start. The readiness to take it on fully, and the courage to begin something hard.',
  'discipline.step.4.need': 'Resources are set aside and the first practical step is done.',
  'discipline.step.5.title': 'Discipline',
  'discipline.step.5.body':
    'The skill of saying no. Focus, boundaries, cutting away the extra, and dealing with distractions.',
  'discipline.step.5.need': 'Limits are set and the main distractions are removed.',
  'discipline.step.6.title': 'Balance',
  'discipline.step.6.body':
    'A steady rhythm. The middle between burnout and idleness — a pace in which the goal can live.',
  'discipline.step.6.need': 'A regular, calm work rhythm is in place.',
  'discipline.step.7.title': 'Perseverance',
  'discipline.step.7.body':
    'The long distance. Going on when the first joy has gone and routine or the first trouble has arrived.',
  'discipline.step.7.need': 'The first drop in motivation or crisis is through.',
  'discipline.step.8.title': 'Flexibility',
  'discipline.step.8.body':
    'Work on mistakes. Change the tactic if the plan failed, instead of dropping the goal.',
  'discipline.step.8.need': 'Mistakes are reviewed and the plan is adjusted.',
  'discipline.step.9.title': 'Habit',
  'discipline.step.9.body':
    'Autopilot. The action has become part of the day — you do it without spending force on doubt.',
  'discipline.step.9.need': 'Work on the goal has become a regular, natural routine.',
  'discipline.step.10.title': 'Result',
  'discipline.step.10.body':
    'Embodiment. The finish you can measure, show or fix in the real world.',
  'discipline.step.10.need': 'The goal is fully reached.',

  'achievement.title': 'Achievements',
  'achievement.add': 'Add',
  'achievement.save': 'Record',
  'achievement.error': 'Name the achievement in your own words.',
  'achievement.full': 'The list is full.',
  'achievement.field.title': 'Achievement',
  'achievement.field.title.placeholder': 'Ran 20 km',
  'achievement.field.detail': 'Detail',
  'achievement.field.detail.placeholder': 'time: 01:36:47',
  'achievement.remove': 'Remove',

  'counsel.title': 'Advisor',
  'counsel.open.a11y': 'Open the advisor',
  'counsel.placeholder': 'Ask from your data…',
  'counsel.empty': 'The advisor is not answering right now.',
  'counsel.error.nokey': 'The advisor is not answering right now.',
  'counsel.error.network': 'The network refused the request.',
  'counsel.error.unauthorized': 'The advisor is not answering right now.',
  'counsel.error.rate': 'Too many questions. Wait a moment, then ask again.',
  'counsel.error.empty': 'Empty reply. Try again.',
  'campaign.kicker': 'Goal',
  'campaign.title': 'Goal',
  'campaign.subtitle':
    'You write the goal. Vectors and methods are a draft. Only what you choose goes on the list.',
  'campaign.example': 'Example: become an engineer, 5 years.',
  'campaign.field.goal': 'Goal',
  'campaign.field.goal.placeholder': 'become an engineer',
  'campaign.field.horizon': 'Term',
  'campaign.field.years': 'years',
  'campaign.field.months': 'mo.',
  'campaign.field.horizon.error': 'The term is one month to thirty years.',
  'campaign.field.goal.error': 'Name the goal in your own words.',
  'campaign.start': 'Start',
  'campaign.vectors.kicker': 'Vectors',
  'campaign.vectors.primary': 'Main',
  'campaign.vectors.supporting': 'Support — up to three',
  'campaign.vectors.confirm': 'Confirm the axes',
  'campaign.orders.kicker': 'Methods',
  'campaign.orders.take': 'Take',
  'campaign.orders.full': 'Three already on the desk. Close one, then take.',
  'campaign.own.placeholder': 'Task',
  'campaign.own.add': 'Add your own atom',
  'campaign.created': 'Goal created',
  'campaign.complete': 'Goal closed',
  'campaign.cancel': 'Cancel',
  'campaign.horizon': 'term {months} mo.',
  'campaign.countdown.left': 'Time left',
  'campaign.countdown.days': 'd',
  'campaign.countdown.hours': 'h',
  'campaign.countdown.minutes': 'min',
  'campaign.countdown.seconds': 'sec',
  'campaign.countdown.ended': 'The time is up, but that is no reason to quit.',
  'campaign.countdown.a11y': '{days} d {hours} h {minutes} min {seconds} sec left',
  'campaign.advice.physical_session.title': 'Workout',
  'campaign.advice.physical_session.instruction':
    'Do one real session: strength, a run, or stretching. Not a walk past the gym.',
  'campaign.advice.intellect_source.title': 'Read or listen',
  'campaign.advice.intellect_source.instruction':
    'One lesson, chapter or lecture on the goal. Not scrolling through your phone.',
  'campaign.advice.mind_still.title': 'Quiet',
  'campaign.advice.mind_still.instruction':
    'Ten minutes without the phone. Sit, breathe, stand up.',
  'campaign.advice.drive_first.title': 'First step today',
  'campaign.advice.drive_first.instruction':
    'Before lunch, take one concrete step toward the goal. Do not plan it — do it.',
  'campaign.advice.craft_artifact.title': 'Show a result',
  'campaign.advice.craft_artifact.instruction':
    'Make one thing you can show: a text, a diagram, a part, a piece of work.',
  'campaign.advice.wealth_count.title': 'Numbers on paper',
  'campaign.advice.wealth_count.instruction':
    'Write down one number: what you owe, what you have, or what left today.',
  'campaign.advice.social_contact.title': 'A real conversation',
  'campaign.advice.social_contact.instruction':
    'Call or meet. Not a message and not a like.',
  'campaign.advice.spirit_inspect.title': 'Why this matters to me',
  'campaign.advice.spirit_inspect.instruction':
    'Calmly answer yourself in one sentence: why this goal.',
  'campaign.advice.engineer_course.title': 'One lesson',
  'campaign.advice.engineer_course.instruction':
    'Take one lesson on the goal and jot down what you understood.',
  'campaign.advice.engineer_project.title': 'An hour of making',
  'campaign.advice.engineer_project.instruction':
    'An hour with your hands in the work: code, a drawing, a scheme. Not theory.',
  'campaign.advice.engineer_mentor.title': 'Ask someone who knows',
  'campaign.advice.engineer_mentor.instruction':
    'Ask one question of a person who already walked this. Not a forum.',
  'onboarding.title': 'ARCHE',
  'onboarding.subtitle': 'Architect of the Self',
  'onboarding.next': 'To the survey',
  'onboarding.who.error': 'A name and a real date of birth.',
  'onboarding.drive.error': 'Write what drives you.',

  'survey.kicker': 'Life survey',
  'survey.title': 'Life survey',
  'survey.subtitle':
    'Only honesty with yourself helps you see who you actually want to be. Answer as you see fit. Only you know how honest the answer is.',
  'survey.gate.subtitle':
    'Only honesty with yourself helps you see who you actually want to be. Answer as you see fit. Only you know how honest the answer is.',
  'survey.apply.needBase': 'Answer every base question.',
  'survey.apply': 'Write it into the Grail',
  'survey.applied': 'The life field has been updated from the survey.',
  'survey.preview': 'Draft of the field',
  'survey.deep.title': 'Detailed reading',
  'survey.deep.hint': 'These questions help you see your personality more clearly.',
  'survey.section.physical': 'Physical',
  'survey.section.intellect': 'Intellect',
  'survey.section.mind_psyche': 'Mind and Mental Health',
  'survey.section.drive': 'Drive',
  'survey.section.craft_career': 'Craft and Career',
  'survey.section.wealth': 'Wealth',
  'survey.section.social': 'Social',
  'survey.section.spirit': 'Spirit',
  'survey.section.rest': 'Rest and leisure',

  'survey.q.phys_sport':
    'How many years in all have you done sport or simply kept the body in tone?',
  'survey.q.phys_sport.none': 'I hardly trained',
  'survey.q.phys_sport.little': 'About a year',
  'survey.q.phys_sport.some': 'A few years',
  'survey.q.phys_sport.much': 'Around a decade',
  'survey.q.phys_sport.life': 'Most of my life',
  'survey.q.phys_activity':
    'This week, are you staying active — walking, running, physical activity?',
  'survey.q.phys_activity.none': 'Almost never',
  'survey.q.phys_activity.rare': 'Rarely',
  'survey.q.phys_activity.some': 'Sometimes',
  'survey.q.phys_activity.often': 'Often',
  'survey.q.phys_activity.daily': 'Almost every day',
  'survey.q.phys_sleep': 'Do you go to bed at about the same time?',
  'survey.q.phys_sleep.none': 'Almost never',
  'survey.q.phys_sleep.rare': 'Rarely',
  'survey.q.phys_sleep.some': 'Sometimes',
  'survey.q.phys_sleep.often': 'Often',
  'survey.q.phys_sleep.daily': 'Almost every day',
  'survey.q.rest_recovery': 'Can you truly rest — let all the cares go?',
  'survey.q.rest_recovery.none': 'Almost never',
  'survey.q.rest_recovery.rare': 'Rarely',
  'survey.q.rest_recovery.some': 'Sometimes',
  'survey.q.rest_recovery.often': 'Often',
  'survey.q.rest_recovery.daily': 'Yes, that is how I live',

  'survey.q.int_books': 'How many books have you read from start to finish in your life?',
  'survey.q.int_books.none': 'Fewer than 10',
  'survey.q.int_books.little': 'More than 10',
  'survey.q.int_books.some': 'Up to 50',
  'survey.q.int_books.much': 'More than 50',
  'survey.q.int_books.life': 'More than 100',
  'survey.q.int_study': 'Are you studying now — courses, a new craft, languages?',
  'survey.q.int_study.none': 'Almost never',
  'survey.q.int_study.rare': 'Rarely',
  'survey.q.int_study.some': 'Sometimes',
  'survey.q.int_study.often': 'Often',
  'survey.q.int_study.daily': 'Almost every day',
  'survey.q.int_docs':
    'Do you watch lectures, documentaries, science programmes — not in the background, with attention?',
  'survey.q.int_docs.none': 'Almost never',
  'survey.q.int_docs.rare': 'Rarely',
  'survey.q.int_docs.some': 'Sometimes',
  'survey.q.int_docs.often': 'Often',
  'survey.q.int_docs.daily': 'Almost every day',

  'survey.q.mind_journal':
    'Do you examine your own mistakes, make notes on them, or keep a journal?',
  'survey.q.mind_journal.none': 'Almost never',
  'survey.q.mind_journal.rare': 'Rarely',
  'survey.q.mind_journal.some': 'Sometimes',
  'survey.q.mind_journal.often': 'Often',
  'survey.q.mind_journal.daily': 'Almost every day',
  'survey.q.mind_stress':
    'When emotions get out of control, do you hold back from acting on impulse?',
  'survey.q.mind_stress.none': 'Almost never',
  'survey.q.mind_stress.rare': 'Rarely',
  'survey.q.mind_stress.some': 'Sometimes',
  'survey.q.mind_stress.often': 'Often',
  'survey.q.mind_stress.daily': 'Usually yes',
  'survey.q.mind_still': 'Do you spend time in silence without a phone, alone with yourself?',
  'survey.q.mind_still.none': 'Almost never',
  'survey.q.mind_still.rare': 'Rarely',
  'survey.q.mind_still.some': 'Sometimes',
  'survey.q.mind_still.often': 'Often',
  'survey.q.mind_still.daily': 'Almost every day',

  'survey.q.drive_promises': 'Do you keep your word?',
  'survey.q.drive_promises.none': 'Almost never',
  'survey.q.drive_promises.rare': 'Rarely',
  'survey.q.drive_promises.some': 'Sometimes',
  'survey.q.drive_promises.often': 'Often',
  'survey.q.drive_promises.daily': 'Almost always',
  'survey.q.drive_routine': 'Is there a daily rhythm you actually keep?',
  'survey.q.drive_routine.none': 'Almost never',
  'survey.q.drive_routine.rare': 'Rarely',
  'survey.q.drive_routine.some': 'Sometimes',
  'survey.q.drive_routine.often': 'Often',
  'survey.q.drive_routine.daily': 'Almost every day',
  'survey.q.drive_start':
    'Do you take on hard tasks at once, or do you talk yourself into doing it for a long time?',
  'survey.q.drive_start.none': 'Almost never right away',
  'survey.q.drive_start.rare': 'Rarely',
  'survey.q.drive_start.some': 'Sometimes',
  'survey.q.drive_start.often': 'Often',
  'survey.q.drive_start.daily': 'Usually straight away',

  'survey.q.craft_years': 'How many years have you held one work, one craft?',
  'survey.q.craft_years.none': 'Not yet',
  'survey.q.craft_years.little': 'About a year',
  'survey.q.craft_years.some': 'A few years',
  'survey.q.craft_years.much': 'Around a decade',
  'survey.q.craft_years.life': 'Most of adult life',
  'survey.q.craft_depth': 'How much of a professional are you in your work?',
  'survey.q.craft_depth.none': 'I have not found myself',
  'survey.q.craft_depth.tried': 'At the beginning of the path',
  'survey.q.craft_depth.held': 'I work',
  'survey.q.craft_depth.taught': 'I taught others',
  'survey.q.craft_depth.master': 'I live by it',
  'survey.q.craft_create':
    'Do you make things with your hands — craft, repair, build, create?',
  'survey.q.craft_create.none': 'Almost never',
  'survey.q.craft_create.rare': 'Rarely',
  'survey.q.craft_create.some': 'Sometimes',
  'survey.q.craft_create.often': 'Often',
  'survey.q.craft_create.daily': 'Almost every day',

  'survey.q.wealth_account': 'Do you know exactly how much money you have and where it goes?',
  'survey.q.wealth_account.none': 'Almost never',
  'survey.q.wealth_account.rare': 'Rarely',
  'survey.q.wealth_account.some': 'Sometimes',
  'survey.q.wealth_account.often': 'Often',
  'survey.q.wealth_account.daily': 'Yes, I keep track',
  'survey.q.wealth_impulse': 'Can you avoid impulse spending?',
  'survey.q.wealth_impulse.none': 'Almost never',
  'survey.q.wealth_impulse.rare': 'Rarely',
  'survey.q.wealth_impulse.some': 'Sometimes',
  'survey.q.wealth_impulse.often': 'Often',
  'survey.q.wealth_impulse.daily': 'I think first, then I decide',
  'survey.q.wealth_build':
    'Do you have savings that can support you for more than a month, or a passive income?',
  'survey.q.wealth_build.none': 'There are debts',
  'survey.q.wealth_build.tried': 'Not yet',
  'survey.q.wealth_build.held': 'Not longer than a month',
  'survey.q.wealth_build.taught': 'Yes, there is',
  'survey.q.wealth_build.master': 'I can help others',

  'survey.q.social_family':
    'Is the bond with family and the near ones alive, not only on holidays?',
  'survey.q.social_family.none': 'Hardly at all',
  'survey.q.social_family.rare': 'Rarely',
  'survey.q.social_family.some': 'Sometimes',
  'survey.q.social_family.often': 'Often',
  'survey.q.social_family.daily': 'Yes, they are close to me',
  'survey.q.social_friends': 'Are there people you trust?',
  'survey.q.social_friends.none': 'No',
  'survey.q.social_friends.rare': 'One person',
  'survey.q.social_friends.some': 'More than one',
  'survey.q.social_friends.often': 'A circle of friends',
  'survey.q.social_friends.daily': 'I trust people and help others open up',
  'survey.q.social_live':
    'Do you meet people in person more often than you keep in touch online?',
  'survey.q.social_live.none': 'Almost never',
  'survey.q.social_live.rare': 'Rarely',
  'survey.q.social_live.some': 'Sometimes',
  'survey.q.social_live.often': 'Often',
  'survey.q.social_live.daily': 'Usually yes',

  'survey.q.spirit_practice':
    'How often do you use prayer, meditation, or other spiritual practices?',
  'survey.q.spirit_practice.none': 'Almost never',
  'survey.q.spirit_practice.rare': 'Rarely',
  'survey.q.spirit_practice.some': 'Sometimes',
  'survey.q.spirit_practice.often': 'Often',
  'survey.q.spirit_practice.daily': 'Almost every day',
  'survey.q.spirit_books': 'Do you study spiritual books, techniques, practices?',
  'survey.q.spirit_books.none': 'Almost never',
  'survey.q.spirit_books.rare': 'Rarely',
  'survey.q.spirit_books.some': 'Sometimes',
  'survey.q.spirit_books.often': 'Often',
  'survey.q.spirit_books.daily': 'Almost every day',
  'survey.q.spirit_temple':
    'Is there a place where you can meet people who see the world the same way?',
  'survey.q.spirit_temple.none': 'No',
  'survey.q.spirit_temple.rare': 'Rarely',
  'survey.q.spirit_temple.some': 'Sometimes',
  'survey.q.spirit_temple.often': 'Quite often',
  'survey.q.spirit_temple.daily': 'I am there every day',

  'survey.q.leisure_quality':
    'When you rest, do you actually recover, or only let off a little tension?',
  'survey.q.leisure_quality.none': 'No',
  'survey.q.leisure_quality.rare': 'It rarely helps',
  'survey.q.leisure_quality.some': 'Most of the time it works',
  'survey.q.leisure_quality.often': 'It always works',
  'survey.q.leisure_quality.daily': 'I don’t get tired',

  'survey.q.phys_compete': 'Have you taken part in serious sport competitions?',
  'survey.q.phys_compete.none': 'No',
  'survey.q.phys_compete.tried': 'I tried',
  'survey.q.phys_compete.held': 'Yes',
  'survey.q.phys_compete.taught': 'I have awards',
  'survey.q.phys_compete.master': 'A professional',
  'survey.q.phys_endurance':
    'How do you rate your endurance on a 5-point scale, where 5 is a marathon?',
  'survey.q.phys_endurance.one': '1',
  'survey.q.phys_endurance.two': '2',
  'survey.q.phys_endurance.three': '3',
  'survey.q.phys_endurance.four': '4',
  'survey.q.phys_endurance.five': '5',
  'survey.q.int_teach': 'Have you ever taught anyone?',
  'survey.q.int_teach.none': 'No',
  'survey.q.int_teach.tried': 'I tried',
  'survey.q.int_teach.held': 'Yes, I taught',
  'survey.q.int_teach.taught': 'I led others',
  'survey.q.int_teach.master': 'It is my craft',
  'survey.q.int_degree': 'Do you have an academic degree?',
  'survey.q.int_degree.none': 'No',
  'survey.q.int_degree.bachelor': 'Bachelor',
  'survey.q.int_degree.magister': 'Master',
  'survey.q.int_degree.candidate': 'Candidate of sciences',
  'survey.q.int_degree.doctor': 'Doctor of sciences',
  'survey.q.mind_therapy':
    'Have you done serious work on yourself — therapy, a mentor, a long practice?',
  'survey.q.mind_therapy.none': 'No',
  'survey.q.mind_therapy.tried': 'I tried',
  'survey.q.mind_therapy.held': 'Yes, I did that work',
  'survey.q.mind_therapy.taught': 'I helped others',
  'survey.q.mind_therapy.master': 'It is my path',
  'survey.q.mind_daily_sit': 'Do you spend time in silence every day?',
  'survey.q.mind_daily_sit.none': 'Almost never',
  'survey.q.mind_daily_sit.rare': 'Rarely',
  'survey.q.mind_daily_sit.some': 'Sometimes',
  'survey.q.mind_daily_sit.often': 'Often',
  'survey.q.mind_daily_sit.daily': 'Almost every day',
  'survey.q.drive_crisis':
    'Have you gone through a serious crisis yourself, or helped others through one, without giving up on the first day?',
  'survey.q.drive_crisis.none': 'No',
  'survey.q.drive_crisis.tried': 'I tried',
  'survey.q.drive_crisis.held': 'Yes, I went through it',
  'survey.q.drive_crisis.taught': 'I helped others',
  'survey.q.drive_crisis.master': 'It’s my calling',
  'survey.q.drive_lead':
    'Have you taken responsibility for others — a team, a family, a work — and not laid it down?',
  'survey.q.drive_lead.none': 'No',
  'survey.q.drive_lead.tried': 'I tried',
  'survey.q.drive_lead.held': 'Yes',
  'survey.q.drive_lead.taught': 'Easily',
  'survey.q.drive_lead.master': 'I live by it',
  'survey.q.craft_business':
    'Have you built a work of your own, bringing other people in and setting a working hierarchy?',
  'survey.q.craft_business.none': 'No',
  'survey.q.craft_business.tried': 'I tried',
  'survey.q.craft_business.held': 'Yes, I run it',
  'survey.q.craft_business.taught': 'I helped others build one',
  'survey.q.craft_business.master': 'It is my foundation',
  'survey.q.craft_mentor': 'Have you been a teacher or a mentor to someone?',
  'survey.q.craft_mentor.none': 'No',
  'survey.q.craft_mentor.tried': 'I tried',
  'survey.q.craft_mentor.held': 'Yes',
  'survey.q.craft_mentor.taught': 'I did it for a long time',
  'survey.q.craft_mentor.master': 'It’s my calling',
  'survey.q.wealth_employees': 'Have you paid others for their work?',
  'survey.q.wealth_employees.none': 'No',
  'survey.q.wealth_employees.tried': 'A few times',
  'survey.q.wealth_employees.held': 'Yes, small sums',
  'survey.q.wealth_employees.taught': 'Yes, large sums',
  'survey.q.wealth_employees.master': 'I run my own business',
  'survey.q.wealth_compound':
    'Have you made it so that your money works for you, instead of only being spent?',
  'survey.q.wealth_compound.none': 'They have not worked yet',
  'survey.q.wealth_compound.little': 'About a year',
  'survey.q.wealth_compound.some': 'A few years',
  'survey.q.wealth_compound.much': 'Around a decade',
  'survey.q.wealth_compound.life': 'Most of adult life',
  'survey.q.social_community': 'Have you gathered a community of people around you?',
  'survey.q.social_community.none': 'No',
  'survey.q.social_community.tried': 'I tried',
  'survey.q.social_community.held': 'Yes',
  'survey.q.social_community.taught': 'I was a leader of a group',
  'survey.q.social_community.master': 'I am the centre of a large group',
  'survey.q.social_repair': 'Have you been able to restore a broken bond?',
  'survey.q.social_repair.none': 'No',
  'survey.q.social_repair.tried': 'I tried',
  'survey.q.social_repair.held': 'Yes, I have',
  'survey.q.social_repair.taught': 'I reconciled other people',
  'survey.q.social_repair.master': 'People often come to me for help with this',
  'survey.q.spirit_lineage': 'Have you had a teacher or a mentor?',
  'survey.q.spirit_lineage.none': 'No',
  'survey.q.spirit_lineage.tried': 'I tried working with one',
  'survey.q.spirit_lineage.held': 'Yes',
  'survey.q.spirit_lineage.taught': 'Yes, and I still have one',
  'survey.q.spirit_lineage.master': 'Yes, and I pass their knowledge on',
  'survey.q.spirit_vow':
    'Have you given yourself a word for years ahead, fully sure you will keep it?',
  'survey.q.spirit_vow.short': 'I keep to short-term plans',
  'survey.q.spirit_vow.skipped': 'I have not tried',
  'survey.q.spirit_vow.broke': 'I did not keep it',
  'survey.q.spirit_vow.kept': 'Yes, I keep it',
  'survey.q.spirit_vow.inspired': 'I helped others find inspiration',
} as const;

/** Every string the app can render. Declared by the English source text. */
export type TranslationKey = keyof typeof en;
