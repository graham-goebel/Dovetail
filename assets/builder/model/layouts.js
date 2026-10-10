/* The layouts library: tested sections the assistant can drop in, filled
   with the content it gives. Each one is built from the system's blocks and
   components in a combination that holds up at 390px, in dark mode and with
   reduced motion (the builder check renders every one), so the assistant
   composes a page from them instead of writing every section from scratch.

   A layout is { id, kind, name, mood, when, fields, jsx(content) }: kind
   says what the section is for, mood how it reads, fields which content
   keys it uses. jsx fills in whatever the content leaves out with sample
   copy, so a partial content object still lands as a whole section. */

var SAMPLE = {
  eyebrow: "New season",
  title: "Stoneware made slowly",
  lead: "Four glazes, each fired twice, for the table you use every day.",
  action: "Shop the range",
  secondary: "Our story",
  image: "",
  items: [
    { title: "Fired twice", text: "A second firing makes the glaze harder and the colour deeper." },
    { title: "Free repairs", text: "Chip a rim in the first five years and we mend it." },
    { title: "Made to order", text: "Each piece is thrown when you order it, so nothing sits in a warehouse." },
    { title: "Plastic-free", text: "Packed in card and paper pulp that goes straight in the recycling." },
  ],
  stats: [
    { value: "12", label: "Workshops" },
    { value: "4,800", label: "Pieces this year" },
    { value: "5 yrs", label: "Free repairs" },
  ],
  quotes: [
    { quote: "The only mugs that have survived our kitchen. They feel right in the hand.", name: "Ana Ruiz", role: "Owner, Ruiz Bakery" },
    { quote: "Ordering was easy and the bowls arrived better than the photos.", name: "Sam Okafor", role: "Home cook" },
    { quote: "We set every table in the café with them now.", name: "Lee Park", role: "Café Park" },
  ],
  points: ["Thrown by hand in our own studio", "Glazes mixed in small batches", "Safe for the dishwasher and the oven"],
  faqs: [
    { question: "How long does an order take?", answer: "Most pieces ship within two weeks, as each is made to order." },
    { question: "Can I return a piece?", answer: "Yes, within 30 days, unused and in its packaging." },
    { question: "Do you ship abroad?", answer: "We ship across Europe and to the US and Canada." },
  ],
  steps: [
    { title: "Choose", text: "Pick the pieces and glazes you like." },
    { title: "We make it", text: "Each one is thrown and fired for you." },
    { title: "It arrives", text: "Packed by hand and sent in card." },
  ],
  slides: [
    { title: "Fern", text: "Spring" },
    { title: "Tide", text: "Summer" },
    { title: "Clay", text: "Autumn" },
    { title: "Ash", text: "Winter" },
  ],
};

/* Text into a JSX attribute or child that the paste reader takes back as it
   was: a JSON string is a valid JS string literal. lit does the same for a
   list of items. */
function str(v) { return "{" + JSON.stringify(String(v == null ? "" : v)) + "}"; }
function lit(v) { return "{" + JSON.stringify(v) + "}"; }
function pick(c, key) { var v = c && c[key]; return v == null || v === "" || (Array.isArray(v) && !v.length) ? SAMPLE[key] : v; }
function list(c, key, max) { return pick(c, key).slice(0, max); }
function actions(c, one) {
  var a = "<Button variant=\"primary\">" + str(pick(c, "action")) + "</Button>";
  if (!one) a += "<Button variant=\"secondary\">" + str(pick(c, "secondary")) + "</Button>";
  return "{<>" + a + "</>}";
}
function media(c, ratio) {
  var src = c && c.image;
  return src ? "<Image src=" + str(src) + " alt=" + str(c.imageAlt || pick(c, "title")) + " ratio=\"" + ratio + "\" radius=\"media\" />"
    : "<Image placeholder=" + str(pick(c, "title")) + " alt=" + str((c && c.imageAlt) || pick(c, "title")) + " ratio=\"" + ratio + "\" radius=\"media\" />";
}
function head(c) { return " eyebrow=" + str(pick(c, "eyebrow")) + " title=" + str(pick(c, "title")); }
function features(c, max) { return lit(list(c, "items", max).map(function (it) { return { title: String(it.title || ""), description: String(it.text || it.description || "") }; })); }

var LAYOUTS = [
  /* -------------------------------------------------------------- heroes */
  { id: "hero-split", kind: "hero", name: "Split hero", mood: "calm, product",
    when: "Opens a page with the pitch on one side and a picture on the other. The safe default for a product or service.",
    fields: ["eyebrow", "title", "lead", "action", "secondary", "image"],
    jsx: function (c) { return "<HeroBlock layout=\"split\" titleSize=\"display-md\"" + head(c) + " lead=" + str(pick(c, "lead")) + " actions=" + actions(c) + " media={" + media(c, "4:3") + "} />"; } },
  { id: "hero-brand", kind: "hero", name: "Centred brand hero", mood: "bold, loud",
    when: "A big centred statement on the brand fill with texture. For a launch, a campaign or a page that should feel confident.",
    fields: ["eyebrow", "title", "lead", "action", "secondary"],
    jsx: function (c) { return "<HeroBlock layout=\"centered\" tone=\"brand\" texture titleSize=\"display-lg\" spacing=\"xl\"" + head(c) + " lead=" + str(pick(c, "lead")) + " actions=" + actions(c) + " />"; } },
  { id: "hero-cover", kind: "hero", name: "Full-bleed photo hero", mood: "editorial, image-led",
    when: "A wide photograph with the title over it on a scrim. For lifestyle, food, travel or anything that sells on the picture.",
    fields: ["eyebrow", "title", "lead", "action", "image"],
    jsx: function (c) {
      var src = c && c.image ? " src=" + str(c.image) : "";
      return "<Section width=\"wide\" spacing=\"sm\"><Cover ratio=\"21:9\" radius=\"container\" scrim=\"gradient\" align=\"bottom\"" + src + " alt=" + str((c && c.imageAlt) || pick(c, "title")) + head(c) + " body=" + str(pick(c, "lead")) + " actions=" + actions(c, true) + " /></Section>";
    } },
  { id: "hero-statement", kind: "hero", name: "Type-led statement", mood: "editorial, quiet",
    when: "Just words, set very large with lots of room. For a studio, a manifesto or a page where the voice carries it.",
    fields: ["eyebrow", "title", "lead", "action"],
    jsx: function (c) { return "<Section spacing=\"xl\"><Stack gap=\"lg\" align=\"flex-start\"><Text variant=\"eyebrow\">" + str(pick(c, "eyebrow")) + "</Text><Heading level={1} size=\"display-xl\" measure=\"narrow\">" + str(pick(c, "title")) + "</Heading><Text variant=\"lead\" measure=\"default\">" + str(pick(c, "lead")) + "</Text><Button variant=\"primary\">" + str(pick(c, "action")) + "</Button></Stack></Section>"; } },

  /* ------------------------------------------------------------ features */
  { id: "features-cards", kind: "features", name: "Feature cards", mood: "calm, structured",
    when: "Three reasons in raised cards on a quiet band. Reads as considered and easy to scan.",
    fields: ["eyebrow", "title", "lead", "items (title, text)"],
    jsx: function (c) { return "<FeatureGridBlock variant=\"cards\" columns={3} tone=\"subtle\" align=\"start\"" + head(c) + " lead=" + str(pick(c, "lead")) + " items=" + features(c, 3) + " />"; } },
  { id: "features-row", kind: "features", name: "Four-up feature row", mood: "light, product",
    when: "Four short points in a plain row, no cards. For a quick list of benefits under a hero.",
    fields: ["title", "items (title, text)"],
    jsx: function (c) { return "<FeatureGridBlock variant=\"plain\" columns={4} align=\"start\" title=" + str(pick(c, "title")) + " titleSize=\"heading-md\" items=" + features(c, 4) + " />"; } },
  { id: "split-points", kind: "story", name: "Picture and points", mood: "warm, explanatory",
    when: "A picture beside a title, a sentence and a short list. For how something is made or why it's different.",
    fields: ["eyebrow", "title", "lead", "points", "action", "image"],
    jsx: function (c) { return "<SplitBlock" + head(c) + " body=" + str(pick(c, "lead")) + " points=" + lit(list(c, "points", 4).map(String)) + " actions=" + actions(c, true) + " media={" + media(c, "4:3") + "} />"; } },
  { id: "split-dark", kind: "story", name: "Dark split, picture right", mood: "bold, dramatic",
    when: "The same split in a dark band with the picture on the right. Breaks up a long light page.",
    fields: ["eyebrow", "title", "lead", "points", "image"],
    jsx: function (c) { return "<SplitBlock dark reverse" + head(c) + " body=" + str(pick(c, "lead")) + " points=" + lit(list(c, "points", 4).map(String)) + " media={" + media(c, "4:3") + "} />"; } },

  /* --------------------------------------------------------------- proof */
  { id: "stats-band", kind: "proof", name: "Numbers band", mood: "confident",
    when: "Three numbers set large and centred on a muted brand band. For proof that's quick to read.",
    fields: ["title", "stats (value, label)"],
    jsx: function (c) { return "<StatsBlock tone=\"brand-muted\" align=\"center\" title=" + str(pick(c, "title")) + " stats=" + lit(list(c, "stats", 4).map(function (s) { return { value: String(s.value), label: String(s.label) }; })) + " />"; } },
  { id: "quote-large", kind: "proof", name: "One big quote", mood: "warm, personal",
    when: "A single quote set large. Stronger than three when you have one great line.",
    fields: ["quotes (quote, name, role)"],
    jsx: function (c) { return "<TestimonialBlock tone=\"subtle\" quotes=" + lit(list(c, "quotes", 1)) + " />"; } },
  { id: "quotes-grid", kind: "proof", name: "Quote grid", mood: "social, busy",
    when: "Three customer quotes side by side under a title. For breadth of praise.",
    fields: ["title", "quotes (quote, name, role)"],
    jsx: function (c) { return "<TestimonialBlock title=" + str(pick(c, "title")) + " quotes=" + lit(list(c, "quotes", 3)) + " />"; } },

  /* ------------------------------------------------------------ showcase */
  { id: "showcase-coverflow", kind: "showcase", name: "Coverflow showcase", mood: "playful, moving",
    when: "A carousel of covers that turns in Play. For a range, a collection or a portfolio; it gives the page movement.",
    fields: ["title", "lead", "slides (title, text)"],
    jsx: function (c) {
      var slides = list(c, "slides", 6).map(function (s) { return "<Cover ratio=\"3:4\" title=" + str(s.title) + " eyebrow=" + str(s.text || "") + " alt=" + str(s.title) + (s.image ? " src=" + str(s.image) : "") + " />"; }).join("");
      return "<Section><Stack gap=\"lg\"><Stack gap=\"sm\"><Heading size=\"heading-lg\">" + str(pick(c, "title")) + "</Heading><Text variant=\"lead\" measure=\"default\">" + str(pick(c, "lead")) + "</Text></Stack><Carousel layout=\"coverflow\" label=" + str(pick(c, "title")) + ">" + slides + "</Carousel></Stack></Section>";
    } },
  { id: "showcase-marquee", kind: "showcase", name: "Marquee strip", mood: "lively, moving",
    when: "A strip of covers that drifts sideways in Play, on a dark band. For logos, a lookbook or a busy range.",
    fields: ["title", "slides (title, text)"],
    jsx: function (c) {
      var slides = list(c, "slides", 8).map(function (s) { return "<Cover ratio=\"square\" title=" + str(s.title) + " eyebrow=" + str(s.text || "") + " alt=" + str(s.title) + (s.image ? " src=" + str(s.image) : "") + " />"; }).join("");
      return "<Section dark><Stack gap=\"lg\"><Heading size=\"heading-lg\">" + str(pick(c, "title")) + "</Heading><Carousel layout=\"marquee\" label=" + str(pick(c, "title")) + ">" + slides + "</Carousel></Stack></Section>";
    } },

  /* --------------------------------------------------------------- steps */
  { id: "steps", kind: "steps", name: "How it works", mood: "clear, guiding",
    when: "Three or four steps in order, numbered. For a process, onboarding or ordering.",
    fields: ["eyebrow", "title", "steps (title, text)"],
    jsx: function (c) { return "<Section tone=\"subtle\"><Stack gap=\"lg\"><Stack gap=\"sm\"><Text variant=\"eyebrow\">" + str(pick(c, "eyebrow")) + "</Text><Heading size=\"heading-lg\">" + str(pick(c, "title")) + "</Heading></Stack><Stepper orientation=\"horizontal\" current={0} label=" + str(pick(c, "title")) + " steps=" + lit(list(c, "steps", 4).map(function (s) { return { label: String(s.title), description: String(s.text || "") }; })) + " /></Stack></Section>"; } },

  /* ---------------------------------------------------------------- faq */
  { id: "faq", kind: "faq", name: "Questions beside a header", mood: "helpful",
    when: "Questions in an accordion beside the title. Near the foot of a page, before the last call to action.",
    fields: ["title", "lead", "faqs (question, answer)"],
    jsx: function (c) { return "<FaqBlock layout=\"split\" title=" + str(pick(c, "title")) + " lead=" + str(pick(c, "lead")) + " items=" + lit(list(c, "faqs", 6).map(function (q) { return { question: String(q.question), answer: String(q.answer) }; })) + " />"; } },

  /* ---------------------------------------------------------------- close */
  { id: "cta-brand", kind: "cta", name: "Brand call to action", mood: "bold",
    when: "The last band, on the brand fill, with one clear action. Ends a marketing page.",
    fields: ["title", "lead", "action"],
    jsx: function (c) { return "<CtaBlock tone=\"brand\" texture title=" + str(pick(c, "title")) + " lead=" + str(pick(c, "lead")) + " actions=" + actions(c, true) + " />"; } },
  { id: "cta-quiet", kind: "cta", name: "Quiet inset close", mood: "calm, premium",
    when: "A muted inset band with two actions. A softer end for a product page or a premium brand.",
    fields: ["title", "lead", "action", "secondary"],
    jsx: function (c) { return "<CtaBlock tone=\"brand-muted\" bleed=\"inset\" title=" + str(pick(c, "title")) + " lead=" + str(pick(c, "lead")) + " actions=" + actions(c) + " />"; } },
  { id: "cta-dark", kind: "cta", name: "Dark close", mood: "dramatic",
    when: "A dark band to end on, so the page closes with weight.",
    fields: ["title", "lead", "action"],
    jsx: function (c) { return "<CtaBlock dark tone=\"base\" title=" + str(pick(c, "title")) + " lead=" + str(pick(c, "lead")) + " actions=" + actions(c, true) + " />"; } },
];

var KINDS = LAYOUTS.reduce(function (a, l) { if (a.indexOf(l.kind) < 0) a.push(l.kind); return a; }, []);

function layoutById(id) { return LAYOUTS.filter(function (l) { return l.id === id; })[0] || null; }

/* The layouts that match: by kind, and by words in the query against the
   name, mood and when. Nothing given, every layout. */
function findLayouts(query, kind) {
  var words = String(query || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return LAYOUTS.filter(function (l) {
    if (kind && l.kind !== kind) return false;
    if (!words.length) return true;
    var hay = (l.id + " " + l.kind + " " + l.name + " " + l.mood + " " + l.when).toLowerCase();
    return words.some(function (w) { return hay.indexOf(w) >= 0; });
  });
}

/* A layout as one line of the tool's answer. */
function layoutLine(l) { return "- " + l.id + " · " + l.kind + " · " + l.name + " (" + l.mood + "): " + l.when + " Fields: " + l.fields.join(", ") + "."; }

export { KINDS, LAYOUTS, SAMPLE, findLayouts, layoutById, layoutLine };
