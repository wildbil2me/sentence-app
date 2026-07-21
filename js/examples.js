/* Grammar Lab — built-in example lessons.
 *
 * Each example is authored with a small `sentence(text, specs)` helper:
 * every annotation targets a substring of the sentence (the nth occurrence),
 * so offsets are computed here and always land on token boundaries.
 * spec = [matchText, labelId, note?, nth?]   (nth defaults to 1)
 *
 * These load fully offline (no fetch) so the app still works from file://.
 * tools/smoke-test.js validates every annotation and re-emits samples/*.json.
 */
(function () {
  "use strict";
  var GL = (window.GL = window.GL || {});

  function sentence(text, specs, types) {
    var anns = [];
    specs.forEach(function (spec) {
      var match = spec[0], label = spec[1], note = spec[2], nth = spec[3] || 1;
      var at = -1;
      for (var n = 0; n < nth; n++) at = text.indexOf(match, at + 1);
      if (at === -1) {
        if (window.console) console.warn("example: no match for", JSON.stringify(match), "in", JSON.stringify(text));
        return;
      }
      anns.push({ id: GL.uid(), start: at, end: at + match.length, label: label, note: note || "" });
    });
    var s = { text: text, annotations: anns };
    if (types) s.types = types;
    return s;
  }

  /** Assemble a lesson and infer which teaching levels it uses. */
  function make(title, description, sentences) {
    var lesson = GL.store.create(title);
    lesson.description = description;
    lesson.sentences = sentences;
    var used = {};
    sentences.forEach(function (s) {
      s.annotations.forEach(function (a) {
        var l = GL.layerOf(a.label);
        if (l) used[l.id] = true;
      });
    });
    lesson.layers = GL.LAYER_ORDER.filter(function (id) { return used[id]; });
    if (!lesson.layers.length) lesson.layers = ["pos"];
    return lesson;
  }

  /* ================================================================
   * Romeo and Juliet — the Prologue (the Chorus's sonnet)
   * Presented line by line so the verse structure stays visible.
   * ================================================================ */
  function buildRomeoJuliet() {
    return make(
      "Romeo and Juliet — Prologue",
      "Shakespeare's opening sonnet, spoken by the Chorus. Labeled line by line to show parts of speech, phrases, and the relative and adverbial clauses woven through the verse. Because the sonnet's sentences run across several lines, only the two lines that stand alone as complete sentences carry a sentence-type badge — the rest are fragments.",
      [
        sentence("Two households, both alike in dignity,", [
          ["Two", "determiner", "A number acting as a determiner."],
          ["households,", "noun"],
          ["alike", "adjective"],
          ["in dignity,", "prepositional-phrase"],
          ["dignity,", "noun"],
        ]),
        sentence("In fair Verona, where we lay our scene,", [
          ["In fair Verona,", "prepositional-phrase"],
          ["fair", "adjective"],
          ["Verona,", "noun"],
          ["where we lay our scene,", "relative-clause", "Describes Verona — it tells which place."],
          ["we", "pronoun"],
          ["lay", "verb"],
          ["our", "determiner"],
          ["scene,", "noun"],
        ]),
        sentence("From ancient grudge break to new mutiny,", [
          ["From ancient grudge", "prepositional-phrase"],
          ["ancient", "adjective"],
          ["grudge", "noun"],
          ["break", "verb"],
          ["to new mutiny,", "prepositional-phrase"],
          ["new", "adjective"],
          ["mutiny,", "noun"],
        ]),
        sentence("Where civil blood makes civil hands unclean.", [
          ["Where civil blood makes civil hands unclean.", "adverbial-clause", "Tells the result of the grudge breaking out."],
          ["civil", "adjective"],
          ["blood", "noun"],
          ["makes", "verb"],
          ["civil", "adjective", "", 2],
          ["hands", "noun"],
          ["unclean.", "adjective", "An object complement — it describes 'hands'."],
        ]),
        sentence("From forth the fatal loins of these two foes", [
          ["fatal", "adjective"],
          ["loins", "noun"],
          ["of these two foes", "prepositional-phrase"],
          ["these", "determiner"],
          ["two", "determiner"],
          ["foes", "noun"],
        ]),
        sentence("A pair of star-cross'd lovers take their life;", [
          ["A pair of star-cross'd lovers", "noun-phrase", "The full subject of this clause."],
          ["A", "determiner"],
          ["pair", "noun"],
          ["of star-cross'd lovers", "prepositional-phrase"],
          ["star-cross'd", "adjective"],
          ["lovers", "noun"],
          ["take", "verb"],
          ["their life;", "direct-object"],
          ["their", "determiner"],
          ["life;", "noun"],
        ], { structure: "simple", purpose: "declarative" }),
        sentence("Whose misadventured piteous overthrows", [
          ["Whose", "determiner", "A relative possessive — it points back to the lovers."],
          ["misadventured", "adjective"],
          ["piteous", "adjective"],
          ["overthrows", "noun"],
        ]),
        sentence("Do with their death bury their parents' strife.", [
          ["Do", "verb", "A helping (auxiliary) verb paired with 'bury'."],
          ["with their death", "prepositional-phrase"],
          ["their", "determiner"],
          ["death", "noun"],
          ["bury", "verb"],
          ["their", "determiner", "", 2],
          ["parents'", "noun"],
          ["strife.", "noun"],
        ]),
        sentence("The fearful passage of their death-mark'd love,", [
          ["The fearful passage of their death-mark'd love,", "noun-phrase", "Part of the long subject of 'Is' two lines down."],
          ["The", "determiner"],
          ["fearful", "adjective"],
          ["passage", "noun"],
          ["of their death-mark'd love,", "prepositional-phrase"],
          ["death-mark'd", "adjective"],
          ["love,", "noun"],
        ]),
        sentence("And the continuance of their parents' rage,", [
          ["And", "conjunction"],
          ["the", "determiner"],
          ["continuance", "noun"],
          ["of their parents' rage,", "prepositional-phrase"],
          ["parents'", "noun"],
          ["rage,", "noun"],
        ]),
        sentence("Which, but their children's end, nought could remove,", [
          ["Which,", "pronoun", "A relative pronoun standing for the parents' rage."],
          ["but their children's end,", "prepositional-phrase", "Here 'but' means 'except for'."],
          ["children's", "noun"],
          ["end,", "noun"],
          ["nought", "pronoun", "An old word for 'nothing'."],
          ["could", "verb"],
          ["remove,", "verb"],
        ]),
        sentence("Is now the two hours' traffic of our stage;", [
          ["Is", "verb"],
          ["now", "adverb"],
          ["the", "determiner"],
          ["two", "determiner"],
          ["hours'", "noun"],
          ["traffic", "noun"],
          ["of our stage;", "prepositional-phrase"],
          ["our", "determiner", "", 2],
          ["stage;", "noun"],
        ]),
        sentence("The which if you with patient ears attend,", [
          ["if you with patient ears attend,", "adverbial-clause", "A condition — 'if' you listen patiently."],
          ["if", "conjunction"],
          ["you", "pronoun"],
          ["with patient ears", "prepositional-phrase"],
          ["patient", "adjective"],
          ["ears", "noun"],
          ["attend,", "verb"],
        ]),
        sentence("What here shall miss, our toil shall strive to mend.", [
          ["What here shall miss,", "noun-clause", "Acts as the object of 'mend' — whatever the play leaves out."],
          ["here", "adverb"],
          ["shall", "verb"],
          ["miss,", "verb"],
          ["our", "determiner"],
          ["toil", "noun"],
          ["shall", "verb", "", 2],
          ["strive", "verb"],
          ["to mend.", "infinitive-phrase"],
        ], { structure: "complex", purpose: "declarative" }),
      ]
    );
  }

  /* ================================================================
   * The Great Gatsby — closing paragraph (F. Scott Fitzgerald)
   * Em-dash breaks lightly regularized into full stops for clarity.
   * ================================================================ */
  function buildGatsby() {
    return make(
      "The Great Gatsby — Closing Lines",
      "Fitzgerald's famous final paragraph. A showcase of appositive, prepositional, and participial phrases plus a relative clause and a compound sentence. (Em-dashes lightly regularized into sentences.)",
      [
        sentence("Gatsby believed in the green light, the orgastic future that year by year recedes before us.", [
          ["Gatsby", "noun", "A proper noun and the subject of the sentence."],
          ["Gatsby", "subject"],
          ["believed", "verb"],
          ["in the green light,", "prepositional-phrase"],
          ["the", "determiner"],
          ["green", "adjective"],
          ["light,", "noun"],
          ["the orgastic future", "appositive-phrase", "Renames 'the green light'."],
          ["orgastic", "adjective"],
          ["future", "noun"],
          ["that year by year recedes before us.", "relative-clause", "Describes 'the future'."],
          ["that", "pronoun"],
          ["recedes", "verb"],
          ["before us.", "prepositional-phrase"],
          ["us.", "pronoun"],
        ], { structure: "complex", purpose: "declarative" }),
        sentence("It eluded us then, but that's no matter.", [
          ["It eluded us then,", "independent-clause"],
          ["It", "pronoun"],
          ["eluded", "verb"],
          ["us", "pronoun"],
          ["then,", "adverb"],
          ["but", "conjunction", "Joins two independent clauses into a compound sentence."],
          ["that's no matter.", "independent-clause"],
          ["that's", "pronoun"],
          ["no", "determiner"],
          ["matter.", "noun"],
        ], { structure: "compound", purpose: "declarative" }),
        sentence("Tomorrow we will run faster, and stretch out our arms farther.", [
          ["Tomorrow", "adverb"],
          ["we", "pronoun"],
          ["will", "verb", "A helping verb forming the future tense."],
          ["run", "verb"],
          ["faster,", "adverb"],
          ["and", "conjunction"],
          ["stretch", "verb"],
          ["out", "adverb", "A particle completing the phrasal verb 'stretch out'."],
          ["our arms", "direct-object"],
          ["our", "determiner"],
          ["arms", "noun"],
          ["farther.", "adverb"],
        ], { structure: "simple", purpose: "declarative" }),
        sentence("So we beat on, boats against the current, borne back ceaselessly into the past.", [
          ["So", "conjunction"],
          ["we", "pronoun"],
          ["beat", "verb"],
          ["on,", "adverb"],
          ["boats against the current,", "appositive-phrase", "A metaphor renaming 'we'."],
          ["against the current,", "prepositional-phrase"],
          ["current,", "noun"],
          ["borne back ceaselessly into the past.", "participial-phrase", "'Borne' is a past participle describing the boats."],
          ["borne", "verb"],
          ["ceaselessly", "adverb"],
          ["into the past.", "prepositional-phrase"],
          ["past.", "noun"],
        ], { structure: "simple", purpose: "declarative" }),
      ]
    );
  }

  /* ================================================================
   * Frankenstein — the creation scene (Mary Shelley)
   * ================================================================ */
  function buildFrankenstein() {
    return make(
      "Frankenstein — The Creation",
      "Victor brings the creature to life. Rich in complex sentences: a cleft construction, relative clauses, noun phrases, and a semicolon-joined compound sentence.",
      [
        sentence("It was on a dreary night of November that I beheld the accomplishment of my toils.", [
          ["It", "pronoun"],
          ["was", "verb"],
          ["on a dreary night", "prepositional-phrase"],
          ["dreary", "adjective"],
          ["night", "noun"],
          ["of November", "prepositional-phrase"],
          ["November", "noun"],
          ["that I beheld the accomplishment of my toils.", "dependent-clause", "A cleft sentence: 'It was... that I beheld...' emphasizes the night."],
          ["I", "pronoun", "", 2],
          ["beheld", "verb"],
          ["the accomplishment of my toils.", "noun-phrase", "The direct object — what Victor beheld."],
          ["accomplishment", "noun"],
          ["of my toils.", "prepositional-phrase"],
          ["my", "determiner"],
          ["toils.", "noun"],
        ], { structure: "complex", purpose: "declarative" }),
        sentence("With an anxiety that almost amounted to agony, I collected the instruments of life around me.", [
          ["With an anxiety", "prepositional-phrase"],
          ["anxiety", "noun"],
          ["that almost amounted to agony,", "relative-clause", "Describes 'anxiety'."],
          ["that", "pronoun"],
          ["almost", "adverb"],
          ["amounted", "verb"],
          ["to agony,", "prepositional-phrase"],
          ["agony,", "noun"],
          ["I collected the instruments of life around me.", "independent-clause"],
          ["I", "pronoun"],
          ["collected", "verb"],
          ["the instruments of life", "noun-phrase"],
          ["instruments", "noun"],
          ["of life", "prepositional-phrase"],
          ["life", "noun"],
          ["around me.", "prepositional-phrase"],
          ["me.", "pronoun"],
        ], { structure: "complex", purpose: "declarative" }),
        sentence("I saw the dull yellow eye of the creature open; it breathed hard, and a convulsive motion agitated its limbs.", [
          ["I", "pronoun"],
          ["saw", "verb"],
          ["the dull yellow eye of the creature", "noun-phrase", "The direct object of 'saw'."],
          ["dull", "adjective"],
          ["yellow", "adjective"],
          ["eye", "noun"],
          ["of the creature", "prepositional-phrase"],
          ["creature", "noun"],
          ["open;", "verb", "A bare infinitive completing 'saw the eye open'."],
          ["it breathed hard,", "independent-clause"],
          ["it", "pronoun"],
          ["breathed", "verb"],
          ["hard,", "adverb"],
          ["and", "conjunction"],
          ["a convulsive motion agitated its limbs.", "independent-clause"],
          ["a convulsive motion", "noun-phrase"],
          ["convulsive", "adjective"],
          ["motion", "noun"],
          ["agitated", "verb"],
          ["its", "determiner"],
          ["limbs.", "noun"],
        ], { structure: "compound", purpose: "declarative" }),
      ]
    );
  }

  /* ================================================================
   * Dracula — Harker's first sight of the Count (Bram Stoker)
   * ================================================================ */
  function buildDracula() {
    return make(
      "Dracula — The Count Appears",
      "Jonathan Harker meets Count Dracula. Features an inverted subject, participial phrases, and both relative and adverbial clauses.",
      [
        sentence("Within stood a tall old man, clean-shaven save for a long white moustache, and clad in black from head to foot.", [
          ["Within", "adverb"],
          ["stood", "verb"],
          ["a tall old man,", "noun-phrase", "The subject — inverted so it follows the verb."],
          ["a", "determiner"],
          ["tall", "adjective"],
          ["old", "adjective"],
          ["man,", "noun"],
          ["clean-shaven", "adjective"],
          ["save for a long white moustache,", "prepositional-phrase", "'Save for' means 'except for'."],
          ["long", "adjective"],
          ["white", "adjective"],
          ["moustache,", "noun"],
          ["and", "conjunction"],
          ["clad in black from head to foot.", "participial-phrase", "'Clad' is a past participle describing the man."],
          ["clad", "verb"],
          ["in black", "prepositional-phrase"],
          ["black", "noun"],
          ["from head to foot.", "prepositional-phrase"],
          ["head", "noun"],
          ["foot.", "noun"],
        ], { structure: "simple", purpose: "declarative" }),
        sentence("He held in his hand an antique silver lamp, which threw long, quivering shadows as it flickered in the draught of the open door.", [
          ["He", "pronoun"],
          ["He", "subject"],
          ["held", "verb"],
          ["in his hand", "prepositional-phrase"],
          ["his", "determiner"],
          ["hand", "noun"],
          ["an antique silver lamp,", "noun-phrase", "The direct object of 'held'."],
          ["antique", "adjective"],
          ["silver", "adjective"],
          ["lamp,", "noun"],
          ["which threw long, quivering shadows", "relative-clause", "Describes 'the lamp'."],
          ["which", "pronoun"],
          ["threw", "verb"],
          ["long,", "adjective"],
          ["quivering", "adjective", "A present participle used as an adjective."],
          ["shadows", "noun"],
          ["as it flickered in the draught of the open door.", "adverbial-clause", "Tells when the shadows were thrown."],
          ["as", "conjunction"],
          ["it", "pronoun"],
          ["flickered", "verb"],
          ["in the draught", "prepositional-phrase"],
          ["draught", "noun"],
          ["of the open door.", "prepositional-phrase"],
          ["open", "adjective"],
          ["door.", "noun"],
        ], { structure: "complex", purpose: "declarative" }),
      ]
    );
  }

  /* ================================================================
   * Kinds of Sentences — a purpose-built showcase of sentence types.
   * Four purposes (declarative, interrogative, imperative, exclamatory)
   * and four structures (simple, compound, complex, compound-complex),
   * each sentence tagged so students can practice quick identification.
   * ================================================================ */
  function buildKinds() {
    return make(
      "Kinds of Sentences",
      "A plain-language set for teaching sentence types at a glance: the four purposes and the four structures, each sentence tagged. Great for the “name that sentence” quiz.",
      [
        sentence("The team practiced hard all week.", [
          ["The", "determiner"],
          ["team", "noun"],
          ["practiced", "verb"],
          ["hard", "adverb"],
          ["all", "determiner"],
          ["week.", "noun"],
          ["The team", "complete-subject"],
          ["team", "simple-subject"],
          ["practiced hard all week.", "complete-predicate"],
          ["practiced", "simple-predicate"],
        ], { structure: "simple", purpose: "declarative" }),
        sentence("Are you ready for the big game?", [
          ["Are", "verb", "The verb comes first because it is a question."],
          ["you", "pronoun"],
          ["you", "simple-subject"],
          ["ready", "adjective", "A predicate adjective describing “you.”"],
          ["ready", "complement"],
          ["for the big game?", "prepositional-phrase"],
          ["big", "adjective"],
          ["game?", "noun"],
        ], { structure: "simple", purpose: "interrogative" }),
        sentence("Pass the ball to me.", [
          ["Pass", "verb", "A command — the subject “you” is understood."],
          ["Pass the ball to me.", "complete-predicate", "The whole sentence is the predicate; the subject is the understood “you.”"],
          ["Pass", "simple-predicate"],
          ["the", "determiner"],
          ["ball", "noun"],
          ["the ball", "direct-object"],
          ["to me.", "prepositional-phrase"],
          ["me.", "pronoun"],
        ], { structure: "simple", purpose: "imperative" }),
        sentence("We finally won the championship!", [
          ["We", "pronoun"],
          ["We", "simple-subject"],
          ["finally", "adverb"],
          ["won", "verb"],
          ["finally won the championship!", "complete-predicate"],
          ["won", "simple-predicate"],
          ["the", "determiner"],
          ["championship!", "noun"],
          ["the championship!", "direct-object"],
        ], { structure: "simple", purpose: "exclamatory" }),
        sentence("The rain stopped, and the sun came out.", [
          ["The", "determiner"],
          ["rain", "noun"],
          ["stopped,", "verb"],
          ["and", "conjunction", "A coordinating conjunction joining two independent clauses."],
          ["the", "determiner"],
          ["sun", "noun"],
          ["came", "verb"],
          ["out.", "adverb"],
          ["The rain stopped,", "independent-clause"],
          ["the sun came out.", "independent-clause"],
        ], { structure: "compound", purpose: "declarative" }),
        sentence("Because we practiced, we played well.", [
          ["Because", "conjunction", "A subordinating conjunction — it makes the clause dependent."],
          ["we", "pronoun"],
          ["practiced,", "verb"],
          ["we", "pronoun", "", 2],
          ["played", "verb"],
          ["well.", "adverb"],
          ["Because we practiced,", "dependent-clause"],
          ["Because we practiced,", "adverbial-clause", "It tells WHY they played well."],
          ["we played well.", "independent-clause"],
        ], { structure: "complex", purpose: "declarative" }),
        sentence("When the whistle blew, the crowd cheered, and the players celebrated.", [
          ["When", "conjunction"],
          ["the", "determiner"],
          ["whistle", "noun"],
          ["blew,", "verb"],
          ["the", "determiner", "", 2],
          ["crowd", "noun"],
          ["cheered,", "verb"],
          ["and", "conjunction"],
          ["the", "determiner", "", 3],
          ["players", "noun"],
          ["celebrated.", "verb"],
          ["When the whistle blew,", "adverbial-clause", "The dependent clause — it can't stand alone."],
          ["the crowd cheered,", "independent-clause"],
          ["and the players celebrated.", "independent-clause"],
        ], { structure: "compound-complex", purpose: "declarative" }),
      ]
    );
  }

  /* ================================================================
   * Parts of Speech Close-Up — every part of speech drilled down to a
   * specific type (noun types, verb types, pronoun types, articles, …),
   * so students can practice the fine distinctions in the quiz.
   * ================================================================ */
  function buildPartsOfSpeech() {
    return make(
      "Parts of Speech Close-Up",
      "Drill-down practice: each word labeled with its specific type — common vs. proper nouns, action vs. linking vs. helping verbs, the pronoun and adjective types, articles, and more.",
      [
        sentence("The team's brave captain from London shared her courage here during the storm.", [
          ["The", "definite-article"],
          ["team's", "possessive-noun"],
          ["brave", "descriptive-adjective"],
          ["captain", "common-noun"],
          ["from", "preposition"],
          ["London", "proper-noun"],
          ["shared", "transitive-verb", "It takes a direct object — shared what? her courage."],
          ["her", "possessive-adjective"],
          ["courage", "abstract-noun"],
          ["here", "adverb-of-place"],
          ["during", "preposition"],
          ["the", "definite-article"],
          ["storm.", "concrete-noun"],
        ], { structure: "simple", purpose: "declarative" }),
        sentence("She is a French doctor, and she can help anyone quickly.", [
          ["She", "personal-pronoun"],
          ["is", "linking-verb"],
          ["a", "indefinite-article"],
          ["French", "proper-adjective"],
          ["doctor,", "common-noun"],
          ["and", "coordinating-conjunction"],
          ["she", "personal-pronoun"],
          ["can", "modal-verb"],
          ["help", "action-verb"],
          ["anyone", "indefinite-pronoun"],
          ["quickly.", "adverb-of-manner"],
        ], { structure: "compound", purpose: "declarative" }),
        sentence("They have finished, but that is not yours.", [
          ["They", "personal-pronoun"],
          ["have", "helping-verb"],
          ["finished,", "action-verb"],
          ["but", "coordinating-conjunction"],
          ["that", "demonstrative-pronoun"],
          ["is", "linking-verb", "", 2],
          ["not", "adverb-of-degree", "A negating adverb."],
          ["yours.", "possessive-pronoun"],
        ], { structure: "compound", purpose: "declarative" }),
        sentence("The icier path was the most dangerous, so we walked very carefully.", [
          ["The", "definite-article"],
          ["icier", "comparative-adjective"],
          ["path", "common-noun"],
          ["was", "linking-verb"],
          ["the", "definite-article"],
          ["most dangerous,", "superlative-adjective"],
          ["so", "coordinating-conjunction"],
          ["we", "personal-pronoun"],
          ["walked", "intransitive-verb", "No direct object — nothing receives the action."],
          ["very", "adverb-of-degree"],
          ["carefully.", "adverb-of-manner"],
        ], { structure: "compound", purpose: "declarative" }),
        sentence("Which of those three books that you read is your favorite?", [
          ["Which", "interrogative-pronoun"],
          ["of", "preposition"],
          ["those", "demonstrative-adjective"],
          ["three", "quantitative-adjective"],
          ["books", "common-noun"],
          ["that", "relative-pronoun"],
          ["you", "personal-pronoun"],
          ["read", "action-verb"],
          ["is", "linking-verb"],
          ["your", "possessive-adjective"],
          ["favorite?", "descriptive-adjective"],
        ], { structure: "complex", purpose: "interrogative" }),
        sentence("Always believe in yourself today.", [
          ["Always", "adverb-of-frequency"],
          ["believe", "action-verb", "A command — the subject “you” is understood."],
          ["in", "preposition"],
          ["yourself", "reflexive-pronoun"],
          ["today.", "adverb-of-time"],
        ], { structure: "simple", purpose: "imperative" }),
        sentence("Wow, neither the team nor the crowd left, because they were truly excited!", [
          ["Wow,", "interjection"],
          ["neither", "correlative-conjunction", "Half of the pair “neither … nor.”"],
          ["the", "definite-article", "", 2],
          ["team", "collective-noun"],
          ["nor", "correlative-conjunction"],
          ["the", "definite-article", "", 3],
          ["crowd", "collective-noun"],
          ["left,", "intransitive-verb"],
          ["because", "subordinating-conjunction"],
          ["they", "personal-pronoun"],
          ["were", "linking-verb"],
          ["truly", "adverb-of-degree"],
          ["excited!", "descriptive-adjective"],
        ], { structure: "complex", purpose: "exclamatory" }),
      ]
    );
  }

  /* ---------------------------------------------------------------- *
   * Registry. The fox demo (defined in store.js) leads the list.
   * ---------------------------------------------------------------- */
  GL.EXAMPLES = [
    {
      id: "fox",
      title: "The Fox and the River",
      subtitle: "Starter demo · every level labeled",
      build: GL.buildSampleLesson,
    },
    {
      id: "parts-of-speech-close-up",
      title: "Parts of Speech Close-Up",
      subtitle: "Word types · noun, verb & pronoun types, articles",
      build: buildPartsOfSpeech,
    },
    {
      id: "kinds-of-sentences",
      title: "Kinds of Sentences",
      subtitle: "Types · four purposes & four structures",
      build: buildKinds,
    },
    {
      id: "romeo-juliet-prologue",
      title: "Romeo and Juliet — Prologue",
      subtitle: "Shakespeare · the Chorus's sonnet",
      build: buildRomeoJuliet,
    },
    {
      id: "great-gatsby-closing",
      title: "The Great Gatsby — Closing Lines",
      subtitle: "Fitzgerald · phrases & compound sentences",
      build: buildGatsby,
    },
    {
      id: "frankenstein-creation",
      title: "Frankenstein — The Creation",
      subtitle: "Shelley · complex & cleft sentences",
      build: buildFrankenstein,
    },
    {
      id: "dracula-count-appears",
      title: "Dracula — The Count Appears",
      subtitle: "Stoker · participles & clauses",
      build: buildDracula,
    },
  ];
})();
