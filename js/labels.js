/* Grammar Lab — label taxonomy.
 * Layers are ordered from smallest unit (word) to largest (clause).
 * Every label id is unique across all layers, so an annotation only
 * needs to store its label id; the layer is derived from here.
 */
(function () {
  "use strict";
  window.GL = window.GL || {};

  GL.LAYERS = {
    pos: {
      id: "pos",
      name: "Parts of Speech",
      short: "Words",
      unit: "word",
      order: 0,
      hint: "Label individual words: noun, verb, adjective…",
    },
    part: {
      id: "part",
      name: "Sentence Parts",
      short: "Parts",
      unit: "group of words",
      order: 1,
      hint: "Label functional parts: subject, predicate, objects…",
    },
    phrase: {
      id: "phrase",
      name: "Phrases",
      short: "Phrases",
      unit: "phrase",
      order: 2,
      hint: "Label multi-word phrases: noun phrase, prepositional phrase…",
    },
    clause: {
      id: "clause",
      name: "Clauses",
      short: "Clauses",
      unit: "clause",
      order: 3,
      hint: "Label clauses: independent, dependent, relative…",
    },
  };

  GL.LAYER_ORDER = ["pos", "part", "phrase", "clause"];

  GL.LABELS = {
    /* ---- Parts of speech (word level) ----
     * Each base part of speech can be labelled on its own, or you can drill
     * down to a specific type. Subtypes carry a `parent` id and inherit their
     * layer and color from that parent (see the inheritance pass below). */
    noun: {
      layer: "pos", name: "Noun", abbr: "N", color: "#f5a623",
      desc: "A person, place, thing, or idea.",
      example: "The <b>fox</b> crossed the <b>river</b>.",
    },
    "common-noun": {
      parent: "noun", name: "Common Noun", abbr: "com",
      desc: "Names a general person, place, thing, or idea — not capitalized.",
      example: "The <b>city</b> by the <b>river</b>.",
    },
    "proper-noun": {
      parent: "noun", name: "Proper Noun", abbr: "prop",
      desc: "Names a specific person, place, or thing — always capitalized.",
      example: "<b>London</b> sits on the <b>Thames</b>.",
    },
    "collective-noun": {
      parent: "noun", name: "Collective Noun", abbr: "coll",
      desc: "Names a group of people or things as a single unit.",
      example: "The <b>team</b> celebrated. A <b>flock</b> of geese.",
    },
    "abstract-noun": {
      parent: "noun", name: "Abstract Noun", abbr: "abs",
      desc: "Names an idea, quality, or feeling you cannot touch.",
      example: "Her <b>courage</b> gave us <b>hope</b>.",
    },
    "concrete-noun": {
      parent: "noun", name: "Concrete Noun", abbr: "conc",
      desc: "Names something you can perceive with your senses.",
      example: "The <b>rain</b> soaked the <b>dog</b>.",
    },
    "possessive-noun": {
      parent: "noun", name: "Possessive Noun", abbr: "pos",
      desc: "A noun showing ownership, formed with an apostrophe.",
      example: "The <b>dog's</b> bone; the <b>players'</b> bench.",
    },
    verb: {
      layer: "pos", name: "Verb", abbr: "V", color: "#f4574d",
      desc: "An action or a state of being.",
      example: "She <b>runs</b>. He <b>is</b> tired.",
    },
    "action-verb": {
      parent: "verb", name: "Action Verb", abbr: "act",
      desc: "Shows a physical or mental action.",
      example: "She <b>kicked</b> the ball and <b>thought</b> hard.",
    },
    "linking-verb": {
      parent: "verb", name: "Linking Verb", abbr: "link",
      desc: "Links the subject to a word that renames or describes it.",
      example: "The river <b>is</b> frozen. She <b>seems</b> tired.",
    },
    "helping-verb": {
      parent: "verb", name: "Helping (Auxiliary) Verb", abbr: "help",
      desc: "Works with a main verb to build tense, voice, or mood.",
      example: "She <b>has</b> waited. They <b>are</b> leaving.",
    },
    "transitive-verb": {
      parent: "verb", name: "Transitive Verb", abbr: "trans",
      desc: "An action verb that passes its action to a direct object.",
      example: "She <b>kicked</b> the ball.",
    },
    "intransitive-verb": {
      parent: "verb", name: "Intransitive Verb", abbr: "intr",
      desc: "An action verb with no direct object.",
      example: "The baby <b>smiled</b>. He <b>slept</b>.",
    },
    "modal-verb": {
      parent: "verb", name: "Modal Verb", abbr: "modal",
      desc: "A helping verb expressing possibility, ability, or necessity.",
      example: "You <b>can</b> go. She <b>must</b> stay.",
    },
    "regular-verb": {
      parent: "verb", name: "Regular Verb", abbr: "reg",
      desc: "Forms its past tense by adding -ed.",
      example: "She <b>walked</b> home and <b>waited</b>.",
    },
    "irregular-verb": {
      parent: "verb", name: "Irregular Verb", abbr: "irr",
      desc: "Changes form in the past tense instead of adding -ed.",
      example: "She <b>ran</b> home and <b>went</b> inside.",
    },
    /* Verbals: verb forms that do the work of another part of speech. They sit
     * under `verb` because textbooks introduce them as verb forms, so each desc
     * names the job the word actually does. */
    gerund: {
      parent: "verb", name: "Gerund", abbr: "ger",
      desc: "An -ing verb form acting as a noun.",
      example: "<b>Skating</b> is risky. She loves <b>reading</b>.",
    },
    participle: {
      parent: "verb", name: "Participle", abbr: "part.",
      desc: "A verb form acting as an adjective — usually ending in -ing or -ed.",
      example: "The <b>frozen</b> river; the <b>howling</b> wind.",
    },
    infinitive: {
      parent: "verb", name: "Infinitive", abbr: "inf",
      desc: "“To” plus the base verb, acting as a noun, adjective, or adverb.",
      example: "She wanted <b>to leave</b>. A book <b>to read</b>.",
    },
    particle: {
      parent: "verb", name: "Particle (phrasal verb)", abbr: "prt", tier: "advanced",
      desc: "A short word that joins a verb to change its meaning — it looks like a preposition but has no object.",
      example: "She looked <b>up</b> the word and gave <b>up</b>.",
    },
    adjective: {
      layer: "pos", name: "Adjective", abbr: "Adj", color: "#4d9df4",
      desc: "A word that describes a noun or pronoun.",
      example: "The <b>quick</b>, <b>clever</b> fox.",
    },
    "descriptive-adjective": {
      parent: "adjective", name: "Descriptive Adjective", abbr: "desc",
      desc: "Names a quality of a noun — how it looks, feels, or seems.",
      example: "A <b>tall</b>, <b>blue</b> door.",
    },
    "proper-adjective": {
      parent: "adjective", name: "Proper Adjective", abbr: "prop",
      desc: "An adjective formed from a proper noun — capitalized.",
      example: "<b>French</b> bread; a <b>Shakespearean</b> play.",
    },
    "demonstrative-adjective": {
      parent: "adjective", name: "Demonstrative Adjective", abbr: "dem",
      desc: "Points to which one, right before a noun: this, that, these, those.",
      example: "<b>This</b> book and <b>those</b> pens.",
    },
    "possessive-adjective": {
      parent: "adjective", name: "Possessive Adjective", abbr: "poss",
      desc: "Shows ownership before a noun: my, your, his, her, its, our, their.",
      example: "<b>My</b> dog chased <b>their</b> ball.",
    },
    "quantitative-adjective": {
      parent: "adjective", name: "Adjective of Quantity/Number", abbr: "quant",
      desc: "Tells how much or how many.",
      example: "<b>Three</b> apples and <b>many</b> friends.",
    },
    "comparative-adjective": {
      parent: "adjective", name: "Comparative Adjective", abbr: "compar",
      desc: "Compares two things — often ends in -er or uses “more.”",
      example: "The path is <b>icier</b> and <b>more dangerous</b>.",
    },
    "superlative-adjective": {
      parent: "adjective", name: "Superlative Adjective", abbr: "super",
      desc: "Compares three or more — often ends in -est or uses “most.”",
      example: "The <b>iciest</b>, <b>most dangerous</b> path.",
    },
    adverb: {
      layer: "pos", name: "Adverb", abbr: "Adv", color: "#a06bf5",
      desc: "A word that modifies a verb, adjective, or another adverb.",
      example: "She moved <b>carefully</b> and <b>very</b> quietly.",
    },
    "adverb-of-manner": {
      parent: "adverb", name: "Adverb of Manner", abbr: "manner",
      desc: "Tells how something happens — often ends in -ly.",
      example: "She skated <b>gracefully</b>.",
    },
    "adverb-of-time": {
      parent: "adverb", name: "Adverb of Time", abbr: "time",
      desc: "Tells when something happens.",
      example: "They left <b>yesterday</b> and will return <b>soon</b>.",
    },
    "adverb-of-place": {
      parent: "adverb", name: "Adverb of Place", abbr: "place",
      desc: "Tells where something happens.",
      example: "Look <b>here</b>, not <b>there</b>.",
    },
    "adverb-of-frequency": {
      parent: "adverb", name: "Adverb of Frequency", abbr: "freq",
      desc: "Tells how often something happens.",
      example: "She <b>always</b> wins; he <b>never</b> quits.",
    },
    "adverb-of-degree": {
      parent: "adverb", name: "Adverb of Degree", abbr: "degree",
      desc: "Tells how much or to what extent.",
      example: "It was <b>very</b> cold and <b>quite</b> late.",
    },
    "relative-adverb": {
      parent: "adverb", name: "Relative Adverb", abbr: "rel", tier: "advanced",
      desc: "Begins a clause that describes a noun: where, when, why.",
      example: "The day <b>when</b> the ice broke; the reason <b>why</b> she stopped.",
    },
    pronoun: {
      layer: "pos", name: "Pronoun", abbr: "Pro", color: "#f57f2c",
      desc: "A word that takes the place of a noun.",
      example: "<b>She</b> gave <b>it</b> to <b>them</b>.",
    },
    "personal-pronoun": {
      parent: "pronoun", name: "Personal Pronoun", abbr: "pers",
      desc: "Stands for a specific person or thing: I, you, he, she, it, we, they.",
      example: "<b>She</b> told <b>him</b> the news.",
    },
    "possessive-pronoun": {
      parent: "pronoun", name: "Possessive Pronoun", abbr: "poss",
      desc: "Shows ownership and stands alone: mine, yours, his, hers, ours, theirs.",
      example: "That book is <b>mine</b>, not <b>yours</b>.",
    },
    "reflexive-pronoun": {
      parent: "pronoun", name: "Reflexive Pronoun", abbr: "refl",
      desc: "Refers back to the subject: myself, yourself, itself, themselves…",
      example: "She taught <b>herself</b> to skate.",
    },
    "relative-pronoun": {
      parent: "pronoun", name: "Relative Pronoun", abbr: "rel",
      desc: "Begins a relative clause: who, whom, whose, which, that.",
      example: "The path <b>that</b> led home was icy.",
    },
    "demonstrative-pronoun": {
      parent: "pronoun", name: "Demonstrative Pronoun", abbr: "dem",
      desc: "Points to something and stands alone: this, that, these, those.",
      example: "<b>This</b> is mine; <b>those</b> are hers.",
    },
    "interrogative-pronoun": {
      parent: "pronoun", name: "Interrogative Pronoun", abbr: "interr",
      desc: "Asks a question: who, whom, whose, which, what.",
      example: "<b>Who</b> is there? <b>What</b> happened?",
    },
    "indefinite-pronoun": {
      parent: "pronoun", name: "Indefinite Pronoun", abbr: "indef",
      desc: "Refers to no specific person or thing: anyone, everyone, some, none…",
      example: "<b>Everyone</b> left; <b>nothing</b> remained.",
    },
    "emphatic-pronoun": {
      parent: "pronoun", name: "Emphatic Pronoun", abbr: "emph", tier: "advanced",
      desc: "Same form as a reflexive pronoun, but added only for emphasis — the sentence still works without it.",
      example: "She <b>herself</b> crossed the ice. I built it <b>myself</b>.",
    },
    preposition: {
      layer: "pos", name: "Preposition", abbr: "Prep", color: "#1fbfa5",
      desc: "A word that shows a relationship of place, time, or direction.",
      example: "The cat hid <b>under</b> the porch <b>during</b> the storm.",
    },
    conjunction: {
      layer: "pos", name: "Conjunction", abbr: "Conj", color: "#ef5da8",
      desc: "A word that joins words, phrases, or clauses.",
      example: "Slow <b>but</b> steady, <b>and</b> always calm.",
    },
    "coordinating-conjunction": {
      parent: "conjunction", name: "Coordinating Conjunction", abbr: "coord",
      desc: "Joins equal words or clauses (FANBOYS): for, and, nor, but, or, yet, so.",
      example: "Slow <b>but</b> steady; fast <b>and</b> loud.",
    },
    "subordinating-conjunction": {
      parent: "conjunction", name: "Subordinating Conjunction", abbr: "subord",
      desc: "Begins a dependent clause: because, although, when, if, since…",
      example: "<b>Because</b> the ice was thin, she stopped.",
    },
    "correlative-conjunction": {
      parent: "conjunction", name: "Correlative Conjunction", abbr: "correl",
      desc: "Works in a pair: either/or, neither/nor, both/and, not only/but also.",
      example: "<b>Either</b> stay <b>or</b> go.",
    },
    determiner: {
      layer: "pos", name: "Determiner", abbr: "Det", color: "#8fc93a",
      desc: "A word that introduces a noun: articles, demonstratives, quantifiers.",
      example: "<b>The</b> dog chased <b>a</b> ball past <b>those</b> trees.",
    },
    article: {
      parent: "determiner", name: "Article", abbr: "art",
      desc: "The most common determiners: a, an, and the.",
      example: "<b>The</b> dog chased <b>a</b> ball.",
    },
    "definite-article": {
      parent: "determiner", name: "Definite Article", abbr: "def",
      desc: "“The” — points to a specific noun the reader already knows.",
      example: "<b>The</b> fox crossed <b>the</b> river.",
    },
    "indefinite-article": {
      parent: "determiner", name: "Indefinite Article", abbr: "a/an",
      desc: "“A” or “an” — introduces a noun for the first time or in general.",
      example: "<b>A</b> fox and <b>an</b> owl.",
    },
    interjection: {
      layer: "pos", name: "Interjection", abbr: "Int", color: "#e3c229",
      desc: "A word that expresses sudden emotion.",
      example: "<b>Wow!</b> That was close. <b>Ouch!</b>",
    },

    /* ---- Sentence parts (functional level) ---- */
    subject: {
      layer: "part", name: "Subject", abbr: "Subj", color: "#38bdf8",
      desc: "Who or what the sentence is about — the doer of the verb.",
      example: "<b>The curious fox</b> darted across the river.",
    },
    "simple-subject": {
      parent: "subject", name: "Simple Subject", abbr: "SS", color: "#0ea5e9",
      desc: "The single main noun or pronoun in the subject, without its modifiers.",
      example: "The curious little <b>fox</b> darted across the river.",
    },
    "complete-subject": {
      parent: "subject", name: "Complete Subject", abbr: "CS", color: "#7dd3fc",
      desc: "The simple subject plus all the words that describe it.",
      example: "<b>The curious little fox</b> darted across the river.",
    },
    "compound-subject": {
      parent: "subject", name: "Compound Subject", abbr: "CmpS", color: "#2563eb",
      desc: "Two or more subjects that share the same verb, joined by a conjunction.",
      example: "<b>The fox and the hare</b> raced downhill.",
    },
    "understood-subject": {
      parent: "subject", name: "Understood Subject", abbr: "(You)", color: "#bae6fd",
      desc: "The unstated “you” that is the subject of a command. Because it is not written, mark the word it commands and name the missing subject.",
      example: "<b>Watch</b> the thin ice. — the subject “(you)” is understood.",
    },
    predicate: {
      layer: "part", name: "Predicate", abbr: "Pred", color: "#fb7185",
      desc: "What the subject does or is — the verb and everything that goes with it.",
      example: "The fox <b>darted across the frozen river</b>.",
    },
    "simple-predicate": {
      parent: "predicate", name: "Simple Predicate", abbr: "SP", color: "#f43f5e",
      desc: "The verb (or verb phrase) alone — the action or state, without its modifiers or objects.",
      example: "The curious fox <b>darted</b> across the river.",
    },
    "complete-predicate": {
      parent: "predicate", name: "Complete Predicate", abbr: "CP", color: "#fda4af",
      desc: "The verb plus all the words that complete or modify it.",
      example: "The fox <b>darted across the frozen river</b>.",
    },
    "compound-predicate": {
      parent: "predicate", name: "Compound Predicate", abbr: "CmpP", color: "#e11d48",
      desc: "Two or more verbs that share the same subject, joined by a conjunction.",
      example: "The fox <b>raced downhill and leaped over the log</b>.",
    },
    object: {
      layer: "part", name: "Object", abbr: "Obj", color: "#34d399",
      desc: "A noun or pronoun that receives the action of a verb or is governed by a preposition.",
      example: "She kicked <b>the ball</b>. The keys are under <b>the mat</b>.",
    },
    "direct-object": {
      parent: "object", name: "Direct Object", abbr: "DO",
      desc: "The noun or pronoun that receives the action of the verb.",
      example: "She kicked <b>the ball</b>.",
    },
    "indirect-object": {
      parent: "object", name: "Indirect Object", abbr: "IO",
      desc: "The noun or pronoun that tells to whom or for whom the action is done.",
      example: "She passed <b>her brother</b> the ball.",
    },
    "object-of-preposition": {
      parent: "object", name: "Object of the Preposition", abbr: "OP",
      desc: "The noun or pronoun governed by a preposition — it completes the prepositional phrase.",
      example: "The keys are under <b>the mat</b> by <b>the door</b>.",
    },
    complement: {
      layer: "part", name: "Complement", abbr: "Comp", color: "#c084fc",
      desc: "A word or group that completes the meaning of the subject or object.",
      example: "The river was <b>frozen solid</b>. They elected her <b>captain</b>.",
    },
    "subject-complement": {
      parent: "complement", name: "Subject Complement", abbr: "SC",
      desc: "Follows a linking verb and renames or describes the subject. Its two kinds are the predicate nominative and the predicate adjective.",
      example: "The river <b>is a highway</b>. The ice <b>looks solid</b>.",
    },
    "predicate-nominative": {
      parent: "complement", name: "Predicate Nominative", abbr: "PN",
      desc: "A subject complement that is a noun or pronoun — it renames the subject after a linking verb.",
      example: "The fox is <b>a hunter</b>. That skater became <b>a champion</b>.",
    },
    "predicate-adjective": {
      parent: "complement", name: "Predicate Adjective", abbr: "PA",
      desc: "A subject complement that is an adjective — it describes the subject after a linking verb.",
      example: "The river is <b>frozen</b>. The night grew <b>cold</b>.",
    },
    "object-complement": {
      parent: "complement", name: "Object Complement", abbr: "OC", tier: "advanced",
      desc: "Follows a direct object and renames or describes it.",
      example: "They elected her <b>captain</b>. The frost painted the field <b>white</b>.",
    },
    appositive: {
      layer: "part", name: "Appositive", abbr: "Appos", color: "#fbbf24",
      desc: "A noun or pronoun set beside another to rename it. (A longer renaming word group is an appositive phrase.)",
      example: "My brother <b>Sam</b> skated by. The poet <b>Frost</b> wrote it.",
    },

    /* ---- Phrases ---- */
    "noun-phrase": {
      layer: "phrase", name: "Noun Phrase", abbr: "NP", color: "#f5a623",
      desc: "A noun plus its modifiers, acting together as a noun.",
      example: "<b>The curious little fox</b> watched us.",
    },
    "verb-phrase": {
      layer: "phrase", name: "Verb Phrase", abbr: "VP", color: "#f4574d",
      desc: "A main verb plus its helping verbs.",
      example: "She <b>has been waiting</b> all day.",
    },
    "prepositional-phrase": {
      layer: "phrase", name: "Prepositional Phrase", abbr: "PP", color: "#1fbfa5",
      desc: "A preposition plus its object, acting as an adjective or adverb.",
      example: "The keys are <b>under the mat</b> <b>by the door</b>.",
    },
    "verbal-phrase": {
      layer: "phrase", name: "Verbal Phrase", abbr: "VerbP", color: "#8b5cf6",
      desc: "A phrase built on a verb form — gerund, participle, or infinitive — that acts as a noun, adjective, or adverb rather than as the sentence's verb.",
      example: "<b>Skating on thin ice</b> is risky. She paused <b>to catch her breath</b>.",
    },
    "gerund-phrase": {
      parent: "verbal-phrase", name: "Gerund Phrase", abbr: "GerP", color: "#a06bf5",
      desc: "An -ing verb form plus its objects and modifiers, acting as a noun.",
      example: "<b>Skating on thin ice</b> is risky.",
    },
    "infinitive-phrase": {
      parent: "verbal-phrase", name: "Infinitive Phrase", abbr: "InfP", color: "#4d9df4",
      desc: "“To” plus a verb and its objects, acting as a noun, adjective, or adverb.",
      example: "She paused <b>to catch her breath</b>.",
    },
    "participial-phrase": {
      parent: "verbal-phrase", name: "Participial Phrase", abbr: "PartP", color: "#ef5da8",
      desc: "A participle plus its objects and modifiers, acting as an adjective.",
      example: "<b>Startled by the noise</b>, the deer froze.",
    },
    "appositive-phrase": {
      layer: "phrase", name: "Appositive Phrase", abbr: "AppP", color: "#2fbf6b",
      desc: "A noun phrase that renames the noun right beside it.",
      example: "My neighbor, <b>a retired pilot</b>, tells great stories.",
    },
    "absolute-phrase": {
      layer: "phrase", name: "Absolute Phrase", abbr: "AbsP", color: "#e3c229",
      desc: "A noun plus a participle that modifies the whole sentence.",
      example: "<b>Her heart pounding</b>, she opened the door.",
    },

    /* ---- Clauses ---- */
    "independent-clause": {
      layer: "clause", name: "Independent Clause", abbr: "IC", color: "#38bdf8",
      desc: "A subject and verb that can stand alone as a complete sentence.",
      example: "<b>The ice held</b>, and <b>she crossed safely</b>.",
    },
    "dependent-clause": {
      layer: "clause", name: "Dependent Clause", abbr: "DC", color: "#f57f2c",
      desc: "A subject and verb that cannot stand alone — it depends on the rest of the sentence.",
      example: "<b>Because the ice was thin</b>, she moved carefully.",
    },
    "relative-clause": {
      parent: "dependent-clause", name: "Relative (Adjective) Clause", abbr: "RC", color: "#a06bf5",
      desc: "A dependent clause that describes a noun, usually starting with who, which, or that.",
      example: "The path <b>that led to the river</b> was icy.",
    },
    "adverbial-clause": {
      parent: "dependent-clause", name: "Adverbial Clause", abbr: "AdvC", color: "#1fbfa5",
      desc: "A dependent clause that tells when, where, why, or how.",
      example: "<b>When the sun rose</b>, the ice began to melt.",
    },
    "noun-clause": {
      parent: "dependent-clause", name: "Noun Clause", abbr: "NC", color: "#f5a623",
      desc: "A dependent clause that acts as a noun.",
      example: "She knew <b>that the river was dangerous</b>.",
    },
  };

  /* Subtypes inherit their layer, color, and tier from their parent so those
   * don't have to be repeated on every entry. Every label then gets a `tier`
   * ("essential" | "advanced"): only the Advanced ones are written out above,
   * and anything still untagged defaults to "essential" so partial data can
   * never hide a label from the palette. */
  Object.keys(GL.LABELS).forEach(function (id) {
    var l = GL.LABELS[id];
    if (l.parent) {
      var p = GL.LABELS[l.parent];
      if (p) {
        if (!l.layer) l.layer = p.layer;
        if (!l.color) l.color = p.color;
        if (!l.tier) l.tier = p.tier;
      }
    }
    if (l.tier !== "advanced") l.tier = "essential";
  });

  GL.TIERS = ["essential", "advanced"];

  /** True if a label is in the Essential (classroom-core) set. */
  GL.isEssential = function (labelId) {
    var l = GL.LABELS[labelId];
    return !!l && l.tier !== "advanced";
  };

  /** Keep only Essential labels when `essentialOnly` is on; otherwise pass through. */
  GL.filterTier = function (labelIds, essentialOnly) {
    return essentialOnly ? labelIds.filter(GL.isEssential) : labelIds;
  };

  /** Label ids belonging to a layer, in definition order. */
  GL.labelsForLayer = function (layerId) {
    return Object.keys(GL.LABELS).filter(function (id) {
      return GL.LABELS[id].layer === layerId;
    });
  };

  /** Base (parent-less) label ids in a layer, in definition order. */
  GL.baseLabelsForLayer = function (layerId) {
    return GL.labelsForLayer(layerId).filter(function (id) { return !GL.LABELS[id].parent; });
  };

  /** Subtype label ids whose parent is `parentId`, in definition order. */
  GL.childrenOf = function (parentId) {
    return Object.keys(GL.LABELS).filter(function (id) { return GL.LABELS[id].parent === parentId; });
  };

  /** The family id a label belongs to: its parent's id, or its own if a base. */
  GL.familyOf = function (labelId) {
    var l = GL.LABELS[labelId];
    return l ? (l.parent || labelId) : labelId;
  };

  /** True if a layer defines any drill-down subtypes. */
  GL.layerHasSubtypes = function (layerId) {
    return GL.labelsForLayer(layerId).some(function (id) { return GL.LABELS[id].parent; });
  };

  /** The layer object an annotation's label belongs to (or null). */
  GL.layerOf = function (labelId) {
    var label = GL.LABELS[labelId];
    return label ? GL.LAYERS[label.layer] : null;
  };

  /* ------------------------------------------------------------------ *
   * Sentence types — a whole-sentence classification (not a span label).
   * Two independent axes: STRUCTURE (how the clauses combine) and
   * PURPOSE (what the sentence does). A sentence may carry one of each,
   * shown as a badge for quick, at-a-glance identification.
   * ------------------------------------------------------------------ */
  GL.SENTENCE_TYPES = {
    structure: {
      id: "structure",
      name: "Structure",
      question: "What is the structure of this sentence?",
      hint: "How many clauses, and of what kind.",
      options: {
        simple: {
          name: "Simple", abbr: "S", color: "#22c55e",
          desc: "One independent clause. (It may still have a compound subject or predicate.)",
          example: "The fox crossed the river.",
        },
        compound: {
          name: "Compound", abbr: "Cd", color: "#3b82f6",
          desc: "Two or more independent clauses joined by a coordinating conjunction or a semicolon.",
          example: "The ice held, and she crossed safely.",
        },
        complex: {
          name: "Complex", abbr: "Cx", color: "#a855f7",
          desc: "One independent clause plus at least one dependent clause.",
          example: "Because the ice was thin, she moved carefully.",
        },
        "compound-complex": {
          name: "Compound-Complex", abbr: "CdCx", color: "#ec4899",
          desc: "Two or more independent clauses and at least one dependent clause.",
          example: "When the sun rose, the ice melted, and the fox turned back.",
        },
      },
    },
    purpose: {
      id: "purpose",
      name: "Purpose",
      question: "What is the purpose of this sentence?",
      hint: "What the sentence does — and how it ends.",
      options: {
        declarative: {
          name: "Declarative", abbr: "Decl", color: "#0ea5e9",
          desc: "Makes a statement. Ends with a period.",
          example: "The fox crossed the river.",
        },
        interrogative: {
          name: "Interrogative", abbr: "Interr", color: "#f59e0b",
          desc: "Asks a question. Ends with a question mark.",
          example: "Did the fox cross the river?",
        },
        imperative: {
          name: "Imperative", abbr: "Imper", color: "#14b8a6",
          desc: "Gives a command or makes a request. The subject “you” is usually understood.",
          example: "Cross the river carefully.",
        },
        exclamatory: {
          name: "Exclamatory", abbr: "Excl", color: "#ef4444",
          desc: "Expresses strong emotion. Ends with an exclamation point.",
          example: "What a leap that was!",
        },
      },
    },
  };

  GL.SENTENCE_TYPE_ORDER = ["structure", "purpose"];

  /** The option object for a type axis + value (or null). */
  GL.sentenceTypeOption = function (categoryId, optionId) {
    var cat = GL.SENTENCE_TYPES[categoryId];
    return cat && cat.options[optionId] ? cat.options[optionId] : null;
  };

  /** True if the value is a valid option for the given axis. */
  GL.isSentenceType = function (categoryId, optionId) {
    return !!GL.sentenceTypeOption(categoryId, optionId);
  };
})();
